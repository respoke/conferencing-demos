;(function () {
  /* global
   React: false,
   respoke: false,
   chance: false
   */
  'use strict';
  const { PropTypes, Component } = React;
  const { update } = React.addons;

  /**************************************/

  class LoadingIndicator extends Component {
    render() {
      return <p>connecting...</p>
    }
  }

  /**************************************/

  class LoginForm extends Component {

    handleSubmit(evt) {
      evt.preventDefault();
      const name = React.findDOMNode(this.refs.name).value.trim();
      this.props.onLoginSubmit({ name });
    }

    render() {
      const { loginDisabled } = this.props;

      return (
        <form className="loginForm" onSubmit={ this.handleSubmit.bind(this) }>
          <label htmlFor="name">Enter your name to join</label>
          <input type="text" id="name" ref="name" placeholder="your name..." required />
          <input type="submit" ref="submit" value="Join" disabled={ loginDisabled } />
        </form>
      );
    }
  }
  LoginForm.propTypes = {
    onLoginSubmit: PropTypes.func.isRequired,
    loginDisabled: PropTypes.bool
  };

  /**************************************/

  class ConferenceControls extends Component {

    render() {
      const { props } = this;
      const muteText = props.muted ? 'unmute mic' : 'mute mic';

      return (
        <div className="conferenceControls">
          <button ref="muteButton" onClick={ props.onMuteClick }>{ muteText }</button>
          <button className="leave" ref="leaveButton" onClick={ props.onLeaveClick }>leave</button>
        </div>
      );
    }
  }
  ConferenceControls.propTypes = {
    onMuteClick: PropTypes.func.isRequired,
    onLeaveClick: PropTypes.func.isRequired,
    muted: PropTypes.bool
  };

  /**************************************/

  class ParticipantList extends Component {
    render() {
      const { participants } = this.props;

      if (!participants.length) {
        return <p>The conference is empty</p>;
      }

      return (
        <fieldset className="participantList">
          <legend>Participants</legend>
          { participants.map(p => {
            return <div>{ p.presence.displayName } </div>;
          }) }
        </fieldset>
      )
    }
  }
  ParticipantList.propTypes = {
    participants: PropTypes.arrayOf(PropTypes.object).isRequired
  };

  /**************************************/

  const statuses = Object.freeze({
    CONNECTING: Symbol('connecting'),
    CONNECTED: Symbol('connected'),
    JOINING_CONFERENCE: Symbol('joining_conference'),
    IN_CONFERENCE: Symbol('in_conference')
  });

  class Conference extends Component {

    constructor(...args) {
      super(...args);

      this.state = {
        appStatus: statuses.CONNECTING,
        participants: [],
        conference: null,
        client: null,
        muted: false
      };
    }

    handleLogin({ name }) {
      const { client } = this.state;

      this.setState({ appStatus: statuses.JOINING_CONFERENCE });
      client.getGroup({ id: 'conference' }).joinConference({
        onConnect: evt => {
          this.setState({
            appStatus: statuses.IN_CONFERENCE,
            conference: evt.call
          });
          client.setPresence({
            presence: {
              inConference: true,
              displayName: name
            }
          });
        },
        onError: err => {
          throw err;
        },
        onHangup: () => {
          this.setState({
            conference: null,
            appStatus: statuses.CONNECTED
          });
          client.setPresence({
            presence: {
              inConference: false
            }
          });
        }
      });
    }

    handleMuteClick() {
      const { muted, conference } = this.state;

      if (muted) {
        conference.outgoingMedia.unmuteAudio();
      } else {
        conference.outgoingMedia.muteAudio();
      }

      this.setState({ muted: !muted });
    }

    handleLeaveClick() {
      const { conference } = this.state;

      if (conference) {
        conference.hangup();
      }

      this.setState({ appStatus: statuses.CONNECTED });
    }

    addParticipant(endpoint) {
      const { participants } = this.state;
      const participant = participants.find(p => p.id === endpoint.id);

      if (!participant) {
        this.setState({
          participants: update(participants, { $push: [endpoint] })
        });
      }
    }

    removeParticipant(endpoint) {
      const { participants } = this.state;
      const index = participants.findIndex(p => p.id === endpoint.id);
      if (index > -1) {
        this.setState({
          participants: update(participants, { $splice: [[index, 1]] })
        });
      }
    }

    handlePresenceChange(evt) {
      const { client } = this.state;

      if (evt.target.className === 'respoke.Client') {
        evt.target = client.getEndpoint({ id: evt.target.endpointId });
        evt.target.presence = evt.presence;
        this.handlePresenceChange(evt);
        return;
      }

      const endpoint = evt.target;

      if (!evt.presence.inConference) {
        this.removeParticipant(endpoint);
        return;
      }

      this.addParticipant(endpoint);
    }

    processNewConnection(connection) {
      const { client } = this.state;
      const endpoint = client.getEndpoint({ id: connection.endpointId });
      endpoint.listen('presence', this.handlePresenceChange.bind(this));
    }

    componentDidMount() {
      const { state } = this;
      const { respoke, connectParams } = this.props;
      const params = Object.assign({}, connectParams, {
        presence: { inConference: false },
        resolveEndpointPresence: presences => {
          return presences[0];
        }
      });

      const client = state.client = respoke.createClient();
      client.connect(params).then(() => {
        client.listen('presence', this.handlePresenceChange.bind(this));
        return client.join({ id: 'conference' });
      }).then(group => {
        group.listen('join', evt => {
          this.processNewConnection(evt.connection);
        });
        return group.getMembers();
      }).then(connections => {
        connections.forEach(this.processNewConnection.bind(this));
        this.setState({ appStatus: statuses.CONNECTED });
      }).catch(err => {
        setTimeout(() => { throw err; }, 0);
      });
    }

    render() {
      let { appStatus, muted, participants } = this.state;

      if (appStatus === statuses.CONNECTING) {
        return (
          <div id="conferenceWidget">
            <LoadingIndicator />
          </div>
        );
      }

      let controls;

      if (appStatus === statuses.IN_CONFERENCE) {
        controls = (
          <ConferenceControls
            muted={ muted }
            onMuteClick={ this.handleMuteClick.bind(this) }
            onLeaveClick={ this.handleLeaveClick.bind(this) }
          />
        );
      } else {
        controls = (
          <LoginForm
            onLoginSubmit={ this.handleLogin.bind(this) }
            loginDisabled={ appStatus === statuses.JOINING_CONFERENCE }
          />
        );
      }

      return (
          <div className="conference" id="conferenceWidget">
            { controls }
            <ParticipantList participants={ participants } />
          </div>
      );
    }
  }
  Conference.propTypes = {
    respoke: PropTypes.object.isRequired,
    connectParams: PropTypes.object.isRequired
  };

  /**************************************/

  const connectParams = {
    appId: '7d002039-508a-4e7f-a567-65b358e23a94',
    developmentMode: true,
    endpointId: chance.word({ syllables: 3 })
  };

  React.render(<Conference respoke={ respoke } connectParams={ connectParams } />, document.getElementById('outlet'));
})();
