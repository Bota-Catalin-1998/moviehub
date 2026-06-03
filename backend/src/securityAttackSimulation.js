process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const API_BASE_URL = "https://moviehub-doyw.onrender.com";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  return {
    status: response.status,
    body
  };
}

async function loginAndGetToken() {
  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: "admin@moviehub.com",
      password: "admin123"
    })
  });

  return response.body.token;
}

async function simulateAttack() {
  console.log("Starting suspicious behaviour simulation...");

  console.log("Simulating failed login attempts...");
  for (let i = 0; i < 8; i++) {
    const response = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@moviehub.com",
        password: `wrong-password-${i}`
      })
    });

    console.log("Failed login", i + 1, response.status);
  }

  console.log("Logging in correctly to get token...");
  const token = await loginAndGetToken();

  if (!token) {
    console.log("Could not login. Stop simulation.");
    return;
  }

  console.log("Simulating invalid OTP attempts...");
  for (let i = 0; i < 4; i++) {
    const response = await request("/auth/login/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@moviehub.com",
        otp: "000000"
      })
    });

    console.log("Invalid OTP", i + 1, response.status);
  }

  console.log("Simulating heavy endpoint hits...");
  for (let i = 0; i < 12; i++) {
    const response = await request("/performance/actors-naive", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Heavy endpoint hit", i + 1, response.status);
  }

  console.log("Requesting security analysis...");

  const analysis = await request("/security/analyze", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  console.log(JSON.stringify(analysis.body, null, 2));
}

simulateAttack();