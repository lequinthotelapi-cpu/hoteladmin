// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `angular-cli.json`.

export const environment = {
  production: false,
  backend: 'http://localhost:4200', // Put your backend here
  firebaseConfig: {
    apiKey: "AIzaSyCxR8K4O1hlF7QvOkXlbjwferyO66ovaFw",
    authDomain: "lequinthotel-ca6ef.firebaseapp.com",
    projectId: "lequinthotel-ca6ef",
    storageBucket: "lequinthotel-ca6ef.firebasestorage.app",
    messagingSenderId: "803175500602",
    appId: "1:803175500602:web:0e920a81f67bbbce8bde03",
    measurementId: "G-PVCGRNJPRZ",
    vapidKey: "BMYz1eOUgBH8muhKrh4UjnSzj38T0Vx5DwmbgCtDYZFCyQopREDXZTbdtf3-JGepsCah1wcdtiWYMs8gJpiyrc8"
  },
  email: 'lequinthotel.api@gmail.com',
  password: 'LeQuint2026.' //valid
};
