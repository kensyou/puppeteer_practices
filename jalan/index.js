const puppeteer = require("puppeteer");
const iconv = require("iconv-lite");
const R = require("ramda");
var fs = require("fs");
var parse = require("csv-parse");
const Subject = require("rxjs").Subject;
var skip = require("rxjs/operators").skip;
var take = require("rxjs/operators").take;
var finalize = require("rxjs/operators").finalize;
var concatMap = require("rxjs/operators").concatMap;

(async () => {
  const browser = await puppeteer.launch({ headless: false, slowMo: 250 });
  // const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.resourceType() === 'image')
      request.abort();
    else
      request.continue();
  });

  var s = new Subject();
  s.pipe(
    skip(1),
    take(3),
    concatMap(async l => {
      const url = l[0];
      console.log("Checking:", url);
      await page.goto(url, {
        waitUntil: "networkidle2"
      });
      const hotel = await page.evaluate(() => {
        const hotel ={};
        hotel.name =  document.querySelector('#yado_header_hotel_name > a').innerHTML;
        hotel.address = document.querySelector('div.shisetsu-accesspartking_body_wrap > table tr:nth-child(1) td:nth-child(3)').innerHTML;
        hotel.access = document.querySelector('div.shisetsu-accesspartking_body_wrap > table tr:nth-child(2) td:nth-child(3) div:nth-child(1)').innerHTML;
        hotel.parking = document.querySelector('div.shisetsu-accesspartking_body_wrap > table tr:nth-child(3) td:nth-child(3)').innerHTML;
        return hotel;
      });
      console.log(hotel);
    }),
    finalize(async () => {
      console.log("close browser");
      await browser.close();
    })
  ).subscribe();

  var parser = parse({ delimiter: "," }, function(err, data) {
    R.forEach(d => {
      s.next(d);
    }, data);
    s.complete("");
  });
  fs.createReadStream(__dirname + "/Naha.csv")
    .pipe(iconv.decodeStream("Shift_JIS"))
    .pipe(parser);
})();


