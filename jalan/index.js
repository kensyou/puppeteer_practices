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
        return hotel;
      });
      if (hotel.name) {
        hotels.push({
          name: hotel.name,
          address: helper.trimAddress(hotel.address),
          access: helper.trimAccess(hotel.access),
          parking: helper.trimParking(hotel.parking)
        });
      }
    }),
    finalize(async () => {
      const columns = {
        name: "ホテル",
        address: "住所",
        access: "アクセス",
        parking: "駐車場"
      };
      stringify(
        hotels,
        { header: true, columns: columns, delimiter: "\t" },
        function(err, output) {
          const s = new Readable();
          s._read = () => {};
          const dest = fs.createWriteStream("output.csv");
          s.push(iconv.encode(output, 'Shift_JIS'));
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
