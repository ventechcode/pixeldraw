const bcrypt = require("bcrypt");
const saltRounds = 10;
const plainPassword = "KgW#^xk$T1iGr4";

bcrypt.hash(plainPassword, saltRounds).then((hash) => {
  console.log(hash); // Add this to your .env file
});
