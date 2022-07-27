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
if (isValidUrl(url)) {
  // Get all network requests of a page
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
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

  // Get licenses of used collections
  const allCollections = await lookupCollections();
  const iconLicenses = Object.entries(allCollections)
    .filter(([key]) => Object.keys(iconsInSets).includes(key))
    .map(([key, value]) => ({ iconSet: key, license: value.license.spdx }));

  // Group by License
  let result = {};
  iconLicenses.forEach((item) => {
    if (item.license in result) {
      result[item.license].push(item.iconSet);
    } else {
      result[item.license] = [item.iconSet];
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
} else {
  console.log("Run this script with the url as the last parameter");
}
