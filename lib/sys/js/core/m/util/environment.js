function environment()
{
  return _environment();
}

function _environment()
{
  if(typeof window !== "undefined")
  {
    const agent = typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
      ? navigator.userAgent.toLowerCase()
      : "";
    return agent.includes(" electron/") ? "electron" : "browser";
  }

  if(typeof process === "object" && process !== null &&
    typeof process.versions === "object" && process.versions !== null &&
    typeof process.versions.node !== "undefined")
  {
    return "nodejs";
  }

  return "undefined";
}

function deviceMobility()
{
  const agent = typeof navigator !== "undefined" && typeof navigator.userAgent === "string"
    ? navigator.userAgent
    : "";

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(agent)
    ? "mobile"
    : "fixed";
}

function isMobile()
{
  return deviceMobility() === "mobile";
}
