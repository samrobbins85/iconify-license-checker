#!/usr/bin/env node
import puppeteer from "puppeteer";
import { lookupCollections } from "@iconify/json";
import chalk from "chalk";

const isValidUrl = (urlString) => {
  try {
    return Boolean(new URL(urlString));
  } catch (e) {
    return false;
  }
};
const url = process.argv[process.argv.length - 1];
if (!isValidUrl(url)) {
  console.log("Run this script with the url as the last parameter");
  return;
}
// Get all network requests of a page
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setRequestInterception(true);
const requests = [];
page.on("request", (request) => {
  requests.push(request.url());
  request.continue();
});
await page.goto(url, {
  waitUntil: "networkidle2",
});
await browser.close();

// Get sets and icons from requests
const iconifyRequests = requests.filter((item) =>
  item.startsWith("https://api.iconify.design/"),
);

if (iconifyRequests.length === 0) {
  console.log("Looks like you don't have any iconify icons on this page");
  return;
}

const re =
  /https:\/\/api\.iconify\.design\/(?<iconset>.+)\.json\?icons=(?<icons>.+)/;
const iconsInSets = iconifyRequests
  .map((item) => item.match(re).groups)
  .reduce(
    (obj, item) =>
      Object.assign(obj, { [item.iconset]: item.icons.split("%2C") }),
    {},
  );
// Get licenses of used collections
const allCollections = await lookupCollections();
let result = {};
Object.keys(iconsInSets).forEach((item) => {
  if (allCollections[item].license.spdx in result) {
    result[allCollections[item].license.spdx].push(item);
  } else {
    result[allCollections[item].license.spdx] = [item];
  }
});
// Log results
Object.entries(result).forEach(([license, set]) => {
  console.log(chalk.bold(license));
  set.forEach((item) => {
    console.log(" " + item);
    iconsInSets[item].forEach((item) => console.log("   " + chalk.dim(item)));
  });
});
