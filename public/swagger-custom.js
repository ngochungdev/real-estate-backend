console.log("swagger custom loaded");

const oldFetch = window.fetch;

window.fetch = async (...args) => {
  const res = await oldFetch(...args);

  try {
    const url = args[0];

    if (typeof url === "string" && url.includes("/auth/login")) {
      const clone = res.clone();
      const data = await clone.json();

      if (data.access_token && window.ui) {
        console.log("Auto authorize:", data.access_token);

        window.ui.authActions.authorize({
          "access-token": {
            name: "access-token",
            schema: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT",
            },
            value: `${data.access_token}`,
          },
        });
      }
    }
  } catch (err) {
    console.log(err);
  }

  return res;
};