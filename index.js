import puppeteer from "puppeteer";
import { lookupCollections } from "@iconify/json";
import chalk from "chalk";
const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setRequestInterception(true);
const requests = [];
page.on("request", (request) => {
  requests.push(request.url());
  request.continue();
});
await page.goto(
  "https://samrobbinsuk-dwoll5vxl-samrobbins.vercel.app/projects",
  {
    waitUntil: "networkidle2",
  }
);
await browser.close();
const iconifyRequests = requests.filter((item) =>
  item.startsWith("https://api.iconify.design/")
);
const re =
  /https:\/\/api\.iconify\.design\/(?<iconset>.+)\.json\?icons=(?<icons>.+)/;
const iconsInSets = iconifyRequests
  .map((item) => item.match(re).groups)
  .map((item) => ({
    iconset: item.iconset,
    icons: item.icons.split("%2C"),
  }))
  .reduce(
    (obj, item) => Object.assign(obj, { [item.iconset]: item.icons }),
    {}
  );

const allCollections = await lookupCollections();
const iconLicenses = Object.entries(allCollections)
  .filter(([key]) => Object.keys(iconsInSets).includes(key))
  .map(([key, value]) => ({ iconSet: key, license: value.license.spdx }));

let result = {};
iconLicenses.forEach((item) => {
  if (item.license in result) {
    result[item.license].push(item.iconSet);
  } else {
    result[item.license] = [item.iconSet];
  }
});
Object.entries(result).forEach(([license, set]) => {
  console.log(chalk.bold(license));
  set.forEach((item) => {
    console.log(" " + item);
    iconsInSets[item].forEach((item) => console.log("   " + chalk.dim(item)));
  });
});
