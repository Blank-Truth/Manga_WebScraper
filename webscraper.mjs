import puppeteer from "puppeteer";
import path from "path";
import fs from  "fs";

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });

// This is a custom function that literally just tells Node to pause
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeMangaFreak() {

    // String Formatting Logic
    let mangaName = await rl.question("Enter manga name: ")
    let mangaChapter = await rl.question("Enter chapter number: ")
    rl.close();

    function searchFormatting(title) {
        let position = title.indexOf(" ")
        // console.log(position)
        if (position !== -1) { // Apparently if .indexOf() cannot find a space it returns -1
            let formatted = title.slice(0, position)
            return formatted.toLowerCase()
        } else {
            return title.toLowerCase()
        }
    }

    function nameFormatting(mangaName, mangaChapter) {
        let snaking = mangaName.replaceAll(" ", "_")
        return `${snaking}_${mangaChapter}`
    }

    function numFormatting(name, chapter) {
        let total = 36 + name.length + chapter.length + 1
        return total
    }

    // Launch browser 
    const browser = await puppeteer.launch({headless: false})
    const page = await browser.newPage()
    
    // Go to the site
    const response = await page.goto("https://ww2.mangafreak.me/", {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });

    const Manga = mangaName
    await page.waitForSelector("input[name='search']")
    await page.type("input[name='search']", Manga, {delay: 100})
    await page.keyboard.press("Enter")

    await page.waitForSelector(".manga_search_item")
    
    await page.click('.manga_search_item a[href*="Manga"]')
    await page.waitForSelector(".manga_series_list")

    
    console.log("Status:", response.status());
    
     // Download Cover Image
    async function downloadImage(url, filename) {
        const reply = await fetch(url)
        const buffer = await reply.arrayBuffer()

        fs.writeFileSync(filename, Buffer.from(buffer))
    }
    
    const imageUrl = await page.evaluate((searchSlice) => {
        const img = document.querySelector(`img[src*=${searchSlice}]`)
        return img ? img.src : null;
    }, searchFormatting(mangaName))
    // console.log(imageUrl)
    
    
    await downloadImage(imageUrl, "animePic.jpg")

    await page.click(`.manga_series_list a[href="/Read1_${nameFormatting(mangaName, mangaChapter)}"]`)
    await page.waitForSelector('.slider.round')
    
    await page.click('.slider.round')
    await page.waitForSelector('.prenext.hide')
    
    
    const jpg = await page.$$eval('[id="gohere"]', (elements) => {
        return elements.map(element => element.src)
    })
    console.log(jpg)
    console.log(`No. of chapters: ${jpg.length}`)
    

    // Download Images
    
    async function downloadPngs(filename) {
        const folderName = "Manga_Folder"
        fs.mkdirSync(folderName, {recursive: true})
        for (let i=0; i<(filename.length+1); i++) {
            if (i<filename.length) {
                const links = await fetch(filename[i])
                // console.log(links)
                const fullPath = path.join(folderName, filename[i].slice(numFormatting(mangaName, nameFormatting(mangaName, mangaChapter))))
                console.log(fullPath)
                const buffer = await links.arrayBuffer()
                // console.log(buffer)
                fs.writeFileSync(fullPath, Buffer.from(buffer))
                await delay(3000) // delay for 3000 milliseconds = 3 seconds
            } else {
                await browser.close();
            }
        }
    
    }
    downloadPngs(jpg)


}


// Run the scraper
scrapeMangaFreak();

