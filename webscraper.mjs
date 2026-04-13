import puppeteer from "puppeteer";
import path from "path";
import fs from  "fs";

// This is a custom function that literally just tells Node to pause
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeMangaFreak() {
    // Launch browser 
    const browser = await puppeteer.launch({headless: false})
    const page = await browser.newPage()
    
    // Go to the site
    const response = await page.goto("https://ww2.mangafreak.me/", {
        waitUntil: "domcontentloaded",
        timeout: 60000
    });
    const Manga = "Jujutsu Kaisen"
    await page.waitForSelector("input[name='search']")
    await page.type("input[name='search']", Manga, {delay: 100})
    await page.keyboard.press("Enter")

    await page.waitForSelector(".manga_search_item")
    
    await page.click('.manga_search_item a[href*="Manga"]')
    await page.waitForSelector(".manga_series_list")

    
    console.log("Status:", response.status());
    
     // Download Images
    async function downloadImage(url, filename) {
        const reply = await fetch(url)
        const buffer = await reply.arrayBuffer()

        fs.writeFileSync(filename, Buffer.from(buffer))
    }
    
    const imageUrl = await page.evaluate(() => {
        const img = document.querySelector('img[src*="kaisen"]')
        return img ? img.src : null;
    })
    console.log(imageUrl)
    
    
    await downloadImage(imageUrl, "animePic.jpg")

    await page.click('.manga_series_list a[href="/Read1_Jujutsu_Kaisen_238"]')
    await page.waitForSelector('.slider.round')
    
    await page.click('.slider.round')
    await page.waitForSelector('.prenext.hide')
    
    
    const jpg = await page.$$eval('[id="gohere"]', (elements) => {
        return elements.map(element => element.src)
    })
    console.log(jpg)
    console.log(jpg[1])
    console.log(jpg[1].length)
    
    // Download JPEGS
    
    async function downloadPngs(filename) {
        const folderName = "Manga_Folder"
        fs.mkdirSync(folderName, {recursive: true})
        for (let i=0; i<=filename.length; i++) {
            const links = await fetch(filename[i])
            // console.log(links)
            const fullPath = path.join(folderName, filename[i].slice(69))
            console.log(fullPath)
            const buffer = await links.arrayBuffer()
            // console.log(buffer)
            fs.writeFileSync(fullPath, Buffer.from(buffer))
            await delay(3000) // delay for 3000 milliseconds = 3 seconds
        }
    
    }
    downloadPngs(jpg)


    // await browser.close();
}


// Run the scraper
scrapeMangaFreak();

