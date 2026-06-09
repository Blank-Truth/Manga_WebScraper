import puppeteer from "puppeteer";
import path from "path";
import fs from  "fs";
import PDFDocument from 'pdfkit'
import sizeOf from 'image-size'
import express from 'express'

const app = express()
const PORT = process.env.PORT || 3000

// This is a custom function that literally just tells Node to pause
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.use(express.static('public'))
app.use(express.json());

function checkMemory(milestone) {
    const memory = process.memoryUsage();
    // Convert bytes to Megabytes
    const rss = (memory.rss / 1024 / 1024).toFixed(2); 
    const heap = (memory.heapUsed / 1024 / 1024).toFixed(2);
    
    console.log(`📊 [MEM: ${milestone}] Total RAM: ${rss}MB | Active Data: ${heap}MB`);
}

app.post('/api/chapters', (req, res) => {
    
    const mangaName = req.body.title
    const mangaChapter = req.body.chapter
    checkMemory("1. Before Scrape commences")
    console.log(`You're scraping ${mangaName} chapter ${mangaChapter}`)

    
    async function scrapeMangaFreak() {
        
        function searchFormatting(title) {
            let position = title.indexOf(" ")
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
        const browser = await puppeteer.launch({
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
        })
        const page = await browser.newPage()
        checkMemory("2. Puppeteer Opened")

        // Disguise for Live server
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
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
        //  async function downloadImage(url, filename) {
        //      const reply = await fetch(url)
        //      const buffer = await reply.arrayBuffer()
             
        //      fs.writeFileSync(filename, Buffer.from(buffer))
        //     }
            
        //     const imageUrl = await page.evaluate((searchSlice) => {
        //         const img = document.querySelector(`img[src*=${searchSlice}]`)
        //         return img ? img.src : null;
        // }, searchFormatting(mangaName))
        // await downloadImage(imageUrl, "animePic.jpg")
        
        await page.click(`.manga_series_list a[href="/Read1_${nameFormatting(mangaName, mangaChapter)}"]`)
        await page.waitForSelector('.slider.round')
        
        await page.click('.slider.round')
        await page.waitForSelector('.prenext.hide')
        
    
        const jpg = await page.$$eval('[id="gohere"]', (elements) => {
            return elements.map(element => element.src)
        })
        await browser.close();
        checkMemory("3. Puppeteer closed")
        // console.log(jpg)
        // console.log(`No. of chapters: ${jpg.length}`)
        
        // Download Chapters
        async function downloadPngs(filename) {

            // const folderName = "../Manga_Folder"
            // const chapterFolderName = nameFormatting(mangaName, mangaChapter)
            // fs.mkdirSync(folderName, {recursive: true})
            // const chapterFolderPath = path.join(folderName, chapterFolderName)
            // fs.mkdirSync(chapterFolderPath, {recursive: true})

            const fileNameLength = filename.length
            let doc
            for (let i=0; i<=fileNameLength; i++) {

                if (i === (fileNameLength)) {
                    console.log(`Scraping of ${mangaName} chapter ${mangaChapter} complete!`)
                    doc.end()
                    continue
                }

                const links = await fetch(filename[0])
                const buffer = await links.arrayBuffer()
                const pics = Buffer.from(buffer)
                const rawDimensions = sizeOf(pics)

                if (i === 0) {
                    // Create PDF
                    doc = new PDFDocument({
                        autoFirstPage: false,
                        size: [rawDimensions.width, rawDimensions.height],
                        margins: 0
                    })
                    res.setHeader('Content-Type', 'application/pdf')
                    res.setHeader('Content-Disposition', `attachment; filename="${nameFormatting(mangaName, mangaChapter)}.pdf"`)

                    // This is a sneaky roundabout method of sending text to the frontend despite content type already being set
                    res.setHeader('Chapter-Name', `${nameFormatting(mangaName, mangaChapter)}`)
                    doc.pipe(res)   
                }
                if (i<fileNameLength) {
                    // const fullPath = path.join(chapterFolderPath, filename[i].slice(numFormatting(mangaName, nameFormatting(mangaName, mangaChapter))))
                    // console.log(fullPath)
                    // fs.writeFileSync(fullPath, pics)
                    doc.addPage({
                        size: [rawDimensions.width, rawDimensions.height],
                        margin: 0
                    })
                    // console.log(`Adding Page ${i}`)
                    doc.image(pics, 0, 0, { 
                        width: rawDimensions.width,
                        height: rawDimensions.height
                    }) 
                    checkMemory(`4. Downloaded Page ${i}`)
                    // console.log(`Affixing Image ${i}`)
                    filename.shift()
                    await delay(3000) // Delay for 3000 milliseconds = 3 seconds

                } 
            }
        }
        downloadPngs(jpg)  
    }
    // Run the scraper
    scrapeMangaFreak();
})    

app.listen(PORT, () => {
  console.log('Server is running at http://localhost:3000/webscraper.html');
});
