# conferencing demos
This application is an example of using the conferencing feature of
[Respoke](https://www.respoke.io) to add realtime multi-party conferencing capabilities to any
web application. Both applications are functionally identical- the only difference is that one
is written in plain ES5 javascript, while the other is written using the
[React javascript ui library](http://facebook.github.io/react/) and ES2015 (ES6) via the
[Babel javascript transpiler](https://babeljs.io/docs/learn-es2015/).

## running the demos
You can see the demos in action at:

- plan javascript version: https://respoke.github.io/conferencing-demos/plain/
- react version: https://respoke.github.io/conferencing-demos/react/

You can also clone this repo and run them yourself using any sort of static file server, such
as the [python](https://wiki.python.org/moin/BeginnersGuide/Download) built-in http server:

```bash
git clone https://github.com/respoke/conferencing-demos
cd conferencing-demos/react
python -m SimpleHTTPServer
open http://localhost:8000
```

Another option is to tinker with the application on [codepen](http://codepen.io/):

- plain javascript version: http://codepen.io/chadxz/pen/ZGajxw
- react version: http://codepen.io/chadxz/pen/yNPWmp

## license
[MIT](LICENSE)
