const puppeteer = require("puppeteer");
const iconv = require("iconv-lite");
var fs = require("fs");
var parse = require("csv-parse");
const Subject = require("rxjs").Subject;
var skip = require("rxjs/operators").skip;
var take = require("rxjs/operators").take;
var finalize = require("rxjs/operators").finalize;
var concatMap = require("rxjs/operators").concatMap;
var helper = require("./helper");
const stringify = require("csv-stringify");
const Readable = require("stream").Readable;

(async () => {
  const browser = await puppeteer.launch({ headless: true }); // ({ headless: false, slowMo: 250 });
  const page = await browser.newPage();
  await page.setRequestInterception(true); // intercept to abort all image requests
  page.on("request", request => {
    if (request.resourceType() === "image") request.abort();
    else request.continue();
  });
  const hotels = [];
  var s = new Subject();
  s.pipe(
    skip(1),
    concatMap(async l => {
      const url = l[0];
      const serial = l[1];
      console.log("Checking:", url);
      await page.goto(url, {
        waitUntil: "networkidle2"
      });
      const hotel = await page.evaluate(() => {
        const hotel = {};
        const getInnerHtmlSafe = path => {
          const t = document.querySelector(path);
          return t ? t.innerHTML : "";
        };
        hotel.name = getInnerHtmlSafe("#yado_header_hotel_name > a");
        hotel.address = getInnerHtmlSafe(
          "div.shisetsu-accesspartking_body_wrap > table tr:nth-child(1) td:nth-child(3)"
        );
        hotel.access = getInnerHtmlSafe(
          "div.shisetsu-accesspartking_body_wrap > table tr:nth-child(2) td:nth-child(3) div:nth-child(1)"
        );
        hotel.parking = getInnerHtmlSafe(
          "div.shisetsu-accesspartking_body_wrap > table tr:nth-child(3) td:nth-child(3)"
        );
        hotel.rmWestern = getInnerHtmlSafe(
          "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(1) > td > div > table > tbody > tr:nth-child(2) > td:nth-child(1)"
        );
        hotel.rmJapanese = getInnerHtmlSafe(
          "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(1) > td > div > table > tbody > tr:nth-child(2) > td:nth-child(2)"
        );
        hotel.rmWestJapanese = getInnerHtmlSafe(
          "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(1) > td > div > table > tbody > tr:nth-child(2) > td:nth-child(3)"
        );
        hotel.rmOther = getInnerHtmlSafe(
          "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(1) > td > div > table > tbody > tr:nth-child(2) > td:nth-child(4)"
        );
        hotel.rmTotal = getInnerHtmlSafe(
          "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(1) > td > div > table > tbody > tr:nth-child(2) > td:nth-child(5)"
        );
        const optional = getInnerHtmlSafe(
          "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(3) > td > div > table > tbody > tr:nth-child(1) > td:nth-child(1)"
        );
        if (optional === "シングル") {
          hotel.rmSingle = getInnerHtmlSafe(
            "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(3) > td > div > table > tbody > tr:nth-child(2) > td:nth-child(1)"
          );
          hotel.rmDouble = getInnerHtmlSafe(
            "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(3) > td > div > table > tbody > tr:nth-child(2) > td:nth-child(2)"
          );
          hotel.rmTwin = getInnerHtmlSafe(
            "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(3) > td > div > table > tbody > tr:nth-child(2) > td:nth-child(3)"
          );
          hotel.rmSuite = getInnerHtmlSafe(
            "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(3) > td > div > table > tbody > tr:nth-child(2) > td:nth-child(4)"
          );

          hotel.rmSingleArea = getInnerHtmlSafe(
            "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(3) > td > div > table > tbody > tr:nth-child(3) > td:nth-child(1)"
          );
          hotel.rmDoubleArea = getInnerHtmlSafe(
            "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(3) > td > div > table > tbody > tr:nth-child(3) > td:nth-child(2)"
          );
          hotel.rmTwinArea = getInnerHtmlSafe(
            "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(3) > td > div > table > tbody > tr:nth-child(3) > td:nth-child(3)"
          );
          hotel.rmSuiteArea = getInnerHtmlSafe(
            "div.shisetsu-roomsetsubi_body_wrap > table > tbody > tr:nth-child(3) > td > div > table > tbody > tr:nth-child(3) > td:nth-child(4)"
          );
        }
        return hotel;
      });
      if (hotel.name) {
        const st = text =>
          text && text.trim
            ? text
                .trim()
                .replace("m<sup>2</sup>", "")
                .replace("室", "")
            : "";
        const h = {
          serial: serial,
          url: url,
          name: hotel.name,
          address: helper.trimAddress(hotel.address),
          access: helper.trimAccess(hotel.access),
          parking: helper.trimParking(hotel.parking),
          rmWestern: st(hotel.rmWestern),
          rmJapanese: st(hotel.rmJapanese),
          rmWestJapanese: st(hotel.rmWestJapanese),
          rmOther: st(hotel.rmOther),
          rmTotal: st(hotel.rmTotal),
          rmSingle: st(hotel.rmSingle),
          rmDouble: st(hotel.rmDouble),
          rmTwin: st(hotel.rmTwin),
          rmSuite: st(hotel.rmSuite),
          rmSingleArea: st(hotel.rmSingleArea),
          rmDoubleArea: st(hotel.rmDoubleArea),
          rmTwinArea: st(hotel.rmTwinArea),
          rmSuiteArea: st(hotel.rmSuiteArea)
        };
        console.log(h);
        hotels.push(h);
      }
    }),
    finalize(async () => {
      const columns = {
        serial: "#",
        url: "URL",
        name: "ホテル",
        address: "住所",
        access: "アクセス",
        parking: "駐車場",
        rmWestern: "洋室",
        rmJapanese: "和室",
        rmWestJapanese: "和洋室",
        rmOther: "その他",
        rmTotal: "総部屋数",
        rmSingle: "シングル",
        rmSingleArea: "シングル(sqm)",
        rmDouble: "ダブル",
        rmDoubleArea: "ダブル(sqm)",
        rmTwin: "ツイン",
        rmTwinArea: "ツイン(sqm)",
        rmSuite: "スイート",
        rmSuiteArea: "スイート(sqm)"
      };
      stringify(
        hotels,
        { header: true, columns: columns, delimiter: "\t" },
        function(err, output) {
          const s = new Readable();
          s._read = () => {};
          const dest = fs.createWriteStream("output.csv");
          s.push(output); // Use left if utf8 is not desired. s.push(iconv.encode(output, "Shift_JIS")); 
          s.push(null);
          s.pipe(dest);
        }
      );
      console.log("Finished all... close browser");
      await browser.close();
    })
  ).subscribe();

  var parser = parse({ delimiter: "," });
  parser.on("readable", function(err, data) {
    let record;
    while ((record = parser.read())) {
      s.next(record);
    }
    s.complete("");
  });
  fs.createReadStream(__dirname + "/Naha.csv")
    .pipe(iconv.decodeStream("Shift_JIS"))
    .pipe(parser);
})();
