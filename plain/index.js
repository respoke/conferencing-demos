;(function () {
  /* global
   respoke: false,
   chance: false
   */
  'use strict';
  var client;

  var respokeOptions = {
    appId: '7d002039-508a-4e7f-a567-65b358e23a94',
    developmentMode: true,
    presence: {
      inConference: false
    },
    resolveEndpointPresence: function (presences) {
      return presences[0];
    }
  };

  var statuses = Object.freeze({
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    JOINING_CONFERENCE: 'joining_conference',
    IN_CONFERENCE: 'in_conference'
  });

  var state = window.state = {
    conferenceParticipants: [],
    appStatus: statuses.CONNECTING,
    conference: null
  };

  var $participants = document.getElementById('participants');
  var $nameInput = document.getElementById('name');
  var $joinForm = document.getElementById('joinForm');
  var $joinButton = document.getElementById('joinButton');
  var $muteButton = document.getElementById('muteButton');
  var $leaveButton = document.getElementById('leaveButton');
  var $loadingIndicator = document.getElementById('loading');
  var $conferenceUI = document.getElementById('conference');
  var $participantsAbsentLabel = document.getElementById('noParticipants');
  var $participantDisplay = document.getElementById('participantDisplay');
  var $inProgressPanel = document.getElementById('inProgress');

  function sortParticipants(participantA, participantB) {
    var aVal = participantA.presence.displayName.toLowerCase();
    var bVal = participantB.presence.displayName.toLowerCase();
    if (aVal > bVal) {
      return 1;
    }
    if (aVal < bVal) {
      return -1;
    }
    return 0;
  }

  function renderParticipant(participant) {
      var $participant = document.createElement('div');
      $participant.appendChild(
        document.createTextNode(participant.presence.displayName)
      );
      $participants.appendChild($participant);
  }

  function renderParticipants() {
    while ($participants.hasChildNodes()) {
      $participants.removeChild($participants.lastChild);
    }

    state.conferenceParticipants
      .sort(sortParticipants)
      .forEach(renderParticipant);

    renderConferenceStatus();
  }

  function renderConferenceStatus() {
    var count = state.conferenceParticipants.length;
    $participantsAbsentLabel.className = (count === 0) ? 'active' : 'inactive';
    $participantDisplay.className = (count > 0) ? 'active' : 'inactive';
  }

  function setAppStatus(status) {
    state.appStatus = status;
    $loadingIndicator.className = (status === statuses.CONNECTING) ? 'active' : 'inactive';
    $conferenceUI.className = (status !== statuses.CONNECTING) ? 'active' : 'inactive';
    $inProgressPanel.className = (status === statuses.IN_CONFERENCE) ? 'active' : 'inactive';
    $joinForm.className = (status !== statuses.IN_CONFERENCE) ? 'active' : 'inactive';
    $joinButton.disabled = status === statuses.JOINING_CONFERENCE;
  }

  function addParticipant(endpoint) {
    var exists = state.conferenceParticipants.some(function (participant) {
      return participant.id === endpoint.id;
    });

    if (exists) {
      return;
    }

    state.conferenceParticipants.push(endpoint);
    renderParticipants();
  }

  function removeParticipant(endpoint) {
    var i;
    var participant;
    var len = state.conferenceParticipants.length;

    for (i = 0; i < len; i++) {
      participant = state.conferenceParticipants[i];
      if (participant.id === endpoint.id) {
        state.conferenceParticipants.splice(i, 1);
        renderParticipants();
        return;
      }
    }
  }

  function handlePresenceChange(evt) {
    if (evt.target.className === 'respoke.Client') {
      evt.target = client.getEndpoint({ id: evt.target.endpointId });
      evt.target.presence = evt.presence;
      handlePresenceChange(evt);
      return;
    }

    var endpoint = evt.target;

    if (!evt.presence.inConference) {
      removeParticipant(evt.target);
      return;
    }

    addParticipant(evt.target);
  }

  function processNewConnection(conn) {
    var endpoint = client.getEndpoint({ id: conn.endpointId });
    endpoint.listen('presence', handlePresenceChange);
  }

  $joinForm.addEventListener('submit', function (evt) {
    evt.preventDefault();
    setAppStatus(statuses.JOINING_CONFERENCE);

    var displayName = $nameInput.value;
    client.getGroup({ id: 'conference' }).joinConference({
      onConnect: function (evt) {
        state.conference = evt.call;
        setAppStatus(statuses.IN_CONFERENCE);
        client.setPresence({
          presence: {
            inConference: true,
            displayName: displayName
          }
        });
      },
      onError: function (err) {
        throw err;
      },
      onHangup: function () {
        state.conference = null;
        setAppStatus(statuses.CONNECTED);
        client.setPresence({
          presence: {
            inConference: false
          }
        });
      }
    });
  });

  $muteButton.addEventListener('click', function () {
    state.muted = !state.muted;
    state.conference.toggleAudio();
    $muteButton.innerHTML = state.muted ? 'unmute mic' : 'mute mic';
  });

  $leaveButton.addEventListener('click', function () {
    if (state.conference) {
      state.conference.hangup();
    }
  });

  client = respoke.createClient(respokeOptions);
  var endpointId = chance.word({ syllables: 3 });
  client.connect({ endpointId: endpointId }).then(function () {
    client.listen('presence', handlePresenceChange);
    return client.join({ id: 'conference' });
  }).then(function (group) {
    group.listen('join', function (evt) {
      processNewConnection(evt.connection);
    });
    return group.getMembers();
  }).then(function (connections) {
    connections.forEach(processNewConnection);
    setAppStatus(statuses.CONNECTED);
    renderConferenceStatus();
  }).catch(function (err) {
    setTimeout(function () { throw err; }, 0);
  });
})();
