function signupOrLogin() {
  if (!checkWebAuthnSupport() || !checkUVSupportedPlatform()) {
    alert(
      "Platform based Web Authn not supported. You can use OTP based login"
    );
  } else {
    const email = document.querySelector("#email-address").value;
    fetch("/authenticate", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          const publicKeyOptions = res.authOptions;
          res.create ? signup(publicKeyOptions) : login(publicKeyOptions);
        } else {
          document.querySelector("#message").innerText =
            "Something went wrong!";
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }
}

function signup(publicKeyOptions) {
  publicKeyOptions.challenge = window.base64url.toBuffer(
    publicKeyOptions.challenge
  );

  publicKeyOptions.user.id = window.base64url.toBuffer(
    publicKeyOptions.user.id
  );

  for (let cred of publicKeyOptions.excludeCredentials) {
    cred.id = window.base64url.toBuffer(cred.id);
  }
  window.navigator.credentials
    .create({ publicKey: publicKeyOptions })
    .then((createCredentialResponse) => {
      const credential = {};
      credential.id = window.base64url.encode(createCredentialResponse.rawId);
      credential.rawId = window.base64url.encode(
        createCredentialResponse.rawId
      );
      credential.type = createCredentialResponse.type;

      if (createCredentialResponse.response) {
        const clientDataJSON = window.base64url.encode(
          createCredentialResponse.response.clientDataJSON
        );
        const attestationObject = window.base64url.encode(
          createCredentialResponse.response.attestationObject
        );
        credential.response = {
          clientDataJSON,
          attestationObject,
        };
      }

      fetch("/signup/verify", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(credential),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            document.cookie = `token=${res.token}`;
            window.location = "/";
          } else {
            document.querySelector("#message").innerText = res.message;
          }
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
}

function login(publicKeyOptions) {
  publicKeyOptions.challenge = window.base64url.toBuffer(
    publicKeyOptions.challenge
  );

  for (let cred of publicKeyOptions.allowCredentials) {
    cred.id = window.base64url.toBuffer(cred.id);
  }

  window.navigator.credentials
    .get({ publicKey: publicKeyOptions })
    .then((getCredentialResponse) => {
      const credential = {};
      credential.id = getCredentialResponse.id;
      credential.type = getCredentialResponse.type;
      credential.rawId = window.base64url.encode(getCredentialResponse.rawId);

      if (getCredentialResponse.response) {
        const clientDataJSON = window.base64url.encode(
          getCredentialResponse.response.clientDataJSON
        );
        const authenticatorData = window.base64url.encode(
          getCredentialResponse.response.authenticatorData
        );
        const signature = window.base64url.encode(
          getCredentialResponse.response.signature
        );
        const userHandle = window.base64url.encode(
          getCredentialResponse.response.userHandle
        );
        credential.response = {
          clientDataJSON,
          authenticatorData,
          signature,
          userHandle,
        };
      }

      console.log(getCredentialResponse);

      fetch("/login/verify", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(credential),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            document.cookie = `token=${res.token}`;
            window.location = "/";
          } else {
            document.querySelector("#message").innerText = res.message;
          }
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
}

function getUser() {
  fetch("/user")
    .then((res) => res.json())
    .then((res) => {
      if (res.success) {
        document.querySelector("#user").innerText = res.user.email;
      }
    })
    .catch((err) => {
      console.log(err);
    });
}

function getNotes() {
  fetch("/notes")
    .then((res) => res.json())
    .then((res) => {
      if (res.success) {
        const notes = res.notes;
        const notesEl = document.querySelector("#notes");
        const noteTemplateEl = document.querySelector("#note");
        notesEl.innerHTML = "";
        notes.forEach((note) => {
          const noteEl = noteTemplateEl.cloneNode(true);
          noteEl.querySelector("#note-text").innerText = note.text;
          noteEl.classList.remove("hidden");
          notesEl.appendChild(noteEl);
        });
      }
    })
    .catch((err) => {
      console.log(err);
    });
}

function addNote() {
  const text = document.querySelector("#ta-notes").value;
  fetch("/notes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
    }),
  })
    .then((res) => res.json())
    .then((res) => {
      console.log(res);
      if (res.success) {
        getNotes();
      }
    })
    .catch((err) => {
      console.error(err);
    });
}

function logout() {
  document.cookie = "token=";
  window.location = "/";
}

function checkWebAuthnSupport() {
  return (
    !!window.PublicKeyCredential &&
    !!window.navigator.credentials &&
    !!window.navigator.credentials.create
  );
}

function checkUVSupportedPlatform() {
  return window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}
