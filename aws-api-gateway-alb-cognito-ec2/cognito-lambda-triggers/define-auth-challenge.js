// Trigger 1: DefineAuthChallenge
// Cognito puchta hai — "kya challenge issue karna hai ya token de dena hai?"
//
// Flow:
//   session=[] (pehli baar)  → CUSTOM_CHALLENGE issue karo
//   session[0].result=true   → tokens de do (login success)
//   session[0].result=false  → auth fail karo

exports.handler = async (event) => {
  const session = event.request.session;

  if (session.length === 0) {
    // Pehla step: custom challenge maango
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = 'CUSTOM_CHALLENGE';

  } else if (session.length === 1 && session[0].challengeResult === true) {
    // VerifyAuthChallenge ne bola "answerCorrect: true" → tokens issue karo
    event.response.issueTokens = true;
    event.response.failAuthentication = false;

  } else {
    // Wrong password ya timeout
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
  }

  return event;
};
