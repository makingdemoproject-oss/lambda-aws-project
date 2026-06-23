// Trigger 2: CreateAuthChallenge
// Cognito ka challenge create karta hai jo client ko bheja jaata hai
// Yahan hum sirf ek "password verifier" challenge banate hain
// Client ko answer mein { email, password } bhejna hoga

exports.handler = async (event) => {
  // Client ko batao: "mujhe password chahiye"
  event.response.publicChallengeParameters = {
    type: 'PASSWORD_VERIFIER',
    message: 'Please provide your email and password as JSON',
  };

  // Lambda-internal parameter (VerifyAuthChallenge ko milega)
  event.response.privateChallengeParameters = {
    type: 'PASSWORD_VERIFIER',
  };

  event.response.challengeMetadata = 'PASSWORD_CHALLENGE';

  return event;
};
