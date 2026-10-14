// Read the host's monotonic high-resolution clock when available; bind the
// method to its receiver so it remains callable outside the Performance object.
const timestamp = typeof globalThis.performance !== "undefined" &&
  typeof globalThis.performance.now === "function"
  ? globalThis.performance.now.bind(globalThis.performance)
  : Date.now;
