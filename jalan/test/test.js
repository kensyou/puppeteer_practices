var assert = require("assert");
var helper = require('../helper');
describe("Array", function() {
  describe("#indexOf()", function() {
    it("should trim address when the a tag starts", function() {
      const target = `沖縄県那覇市牧志３－９－２２\n \n \n \n \n <a id="shisetsu-access-address" href="javascript:staticChangeTab('30', 'form','','','','','','320091' );" class="jlnpc-icon jlnpc-icon--map">MAP</a>\n \n \n `;
      const result = helper.trimAddress(target);
      assert.equal(result, "沖縄県那覇市牧志３－９－２２");
    });
    it("should trim access when coordinates starts", function() {
      const target = `那覇空港より車で最短1５分！牧志駅から徒歩5分！   26°12'56.3"N 127°41'26.5"E`;
      const result = helper.trimAccess(target);
      assert.equal(result, "那覇空港より車で最短1５分！牧志駅から徒歩5分！");
    });
    it("should trim parking when coordinates starts", function() {
      const target = `\n 有り（1,000円／日）\n \n <br>※ 車以外 ⁄ 26°12'56.3"N 127°41'26.5"E\n \n \n <br>※ 車 ⁄ 26°12'56.3"N 127°41'26.5"E<br>MAP CODE 33 158 363*58\n \n `;
      const result = helper.trimParking(target);
      assert.equal(result, "有り（1,000円／日）");
    });
  });
});
