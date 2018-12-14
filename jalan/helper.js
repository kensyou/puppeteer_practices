var trimAddress = function(rawAddress) {
  return rawAddress
    .replace(/\n/g, "")
    .replace(/<a.*$/, "")
    .trim();
};
var trimAccess = function(rawAccess) {
  return rawAccess.replace(/\d*\°.*$/g, "").trim();
};
var trimParking = function(rawParking) {
  return rawParking
    .replace(/\n/g, "")
    .replace(/<br>.*/, "")
    .trim();
};
module.exports = {
  trimAddress,
  trimAccess,
  trimParking,
};
