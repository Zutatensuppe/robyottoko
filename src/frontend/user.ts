let me: any = null;

const getJson = async (path) => {
  const res = await fetch(path);
  return res.status === 200 ? (await res.json()) : null
}

async function init() {
  me = await getJson('/api/user/me')
}

async function logout() {
  const res = await fetch("/api/logout", {
    method: "POST",
  });
  const data = await res.json();
  if (data.success) {
    me = null
    return { error: false }
  } else {
    return { error: "[2021-09-25 18:36]" }
  }
}

async function login(user: string, pass: string) {
  const res = await fetch("/api/auth", {
    method: "post",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user, pass }),
  });
  if (res.status === 200) {
    await init()
    return { error: false }
  } else if (res.status === 401) {
    return { error: (await res.json()).reason }
  } else {
    return { error: "Unknown error" }
  }
}

export default {
  getMe: () => {
    return me
  },
  logout,
  login,
  init,
}
