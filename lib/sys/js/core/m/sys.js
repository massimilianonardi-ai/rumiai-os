
var sys = {};
sys.environment = util.environment();

if(sys.environment === "electron" || sys.environment === "nodejs")
{
  sys.nodejs = {};
  sys.nodejs.assert = require("assert");
  sys.nodejs.buffer = require("buffer");
  sys.nodejs.child_process = require("child_process");
  sys.nodejs.cluster = require("cluster");
  sys.nodejs.crypto = require("crypto");
  sys.nodejs.dgram = require("dgram");
  sys.nodejs.dns = require("dns");
  sys.nodejs.events = require("events");
  sys.nodejs.fs = require("fs");
  sys.nodejs.http = require("http");
  sys.nodejs.https = require("https");
  sys.nodejs.net = require("net");
  sys.nodejs.os = require("os");
  sys.nodejs.path = require("path");
  sys.nodejs.querystring = require("querystring");
  sys.nodejs.readline = require("readline");
  sys.nodejs.stream = require("stream");
  sys.nodejs.string_decoder = require("string_decoder");
  sys.nodejs.timers = require("timers");
  sys.nodejs.tls = require("tls");
  sys.nodejs.tty = require("tty");
  sys.nodejs.url = require("url");
  sys.nodejs.util = require("util");
  sys.nodejs.v8 = require("v8");
  sys.nodejs.vm = require("vm");
  sys.nodejs.zlib = require("zlib");
}

if(sys.environment === "electron")
{
  sys.electron = require("electron");
}
