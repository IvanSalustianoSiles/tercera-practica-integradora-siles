import passport from "passport";
import local from "passport-local";
import GitHubStrategy from "passport-github2";
import jwt from "passport-jwt";
import { CartManager, UserManager } from "../controllers/index.js";
import { isValidPassword, createHash } from "../services/index.js";
import config from "../config.js";
import CustomError from "../services/custom.error.class.js";
import { errorDictionary } from "../config.js";

const localStrategy = local.Strategy;
const jwtStrategy = jwt.Strategy;
const jwtExtractor = jwt.ExtractJwt;

const cookieExtractor = (req) => {
  let token = null;
  if (req && req.cookies) token = req.cookies[`${config.APP_NAME}_cookie`];
  return token;
};

const initAuthStrategies = () => {
  passport.use(
    "login",
    new localStrategy(
      { passReqToCallback: true, usernameField: "email" },
      async (req, username, password, done) => {   
        try {

          let myUser = await UserManager.findUserByEmail(username);

          const validation = isValidPassword(myUser, password);
          
          if (myUser && validation) {
            return done(null, myUser);
          } else {
            return done(new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, "Error al iniciar sesión"), false);
          }
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
  passport.use(
    "register",
    new localStrategy(
      { passReqToCallback: true, usernameField: "email" },
      async (req, username, password, done) => {
      
        try {

          let user = await UserManager.findUserByEmail(username);
          console.log(user);
          
          if (user) return done(new CustomError(errorDictionary.AUTHENTICATE_USER_ERROR, "Datos ya ocupados"), false);
          
          const cart = await CartManager.createCart()        
          
          const newUser = { ...req.body, password: createHash(password), cart: await cart.ID };
          
          
          let result = await UserManager.addUser(newUser);
          return done(null, newUser);
        } catch (error) {
          return done(new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, "Error al registrarse."));
        }
      }
    )
  );
  passport.use(
    "ghlogin",
    new GitHubStrategy(
      {
        clientID: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        callbackURL: config.GITHUB_CALLBACK_URL,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const emailList = profile.emails || null;
          let email = profile._json?.email || null;

          if (!email && !emailList) {
            const response = await fetch("https://api.github.com/user/emails", {
              headers: {
                "Authorization": `token ${accessToken}`,
                "User-Agent": config.APP_NAME
              }
            });
            const emails = await response.json();
            email = emails.filter(email => email.verified).map(email => ({ value: email.email}))
          }
          if (email) {
            const foundUser = await UserManager.findUserByEmail(email || emailList[0]);
            if (!foundUser) {
              const cart = await CartManager.createCartMDB();
              let completeName = profile._json.name.split(" ");
              let last = completeName.pop();
              let first = completeName.join(" ");
              const newUser = {
                first_name: first,
                last_name: last,
                email: email,
                password: "none",
                cart: await cart.ID
              };
              const addingUser = await UserManager.addUser(newUser);
              return done(null, addingUser);
            } else {
              console.log("Usuario previamente registrado.");
              return done(null, foundUser);
            }
          } else {
            return done(new CustomError(errorDictionary.FEW_PARAMS_ERROR, "Datos del perfil"), null);
          }
        } catch (error) {
          return done(new CustomError(errorDictionary.UNHANDLED_ERROR, "Ghlogin"));
        }
      }
    )
  );
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
};

export default initAuthStrategies;
