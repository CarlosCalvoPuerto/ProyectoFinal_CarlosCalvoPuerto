const puppeteer = require('puppeteer');
const xl = require('excel4node');
const path = require('path');

(async ()=>{

    // Abrir Navegador
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args:['--start-maximized']
    })
    const page = await browser.newPage();

    // Ir a Twitch
    await page.goto('https://www.twitch.tv/');

    // Leer Canales Recomendados
    await page.waitForSelector('[data-test-selector="side-nav-card"]');
    const recomendadosList = await page.evaluate(() => {
        const items = document.querySelectorAll('[data-test-selector="side-nav-card"]');
        const arr = []
        for(let item of items) {
            const canal = {};
            canal.name = item.querySelector('[data-a-target="side-nav-title"]').innerText;
            canal.image = item.querySelector('img').src;
            canal.category = item.querySelector('[data-a-target="side-nav-game-title"]').innerText;
            canal.viewers = item.querySelector('[data-a-target="side-nav-live-status"] span').innerText;
            canal.url = item.querySelector('[data-test-selector="recommended-channel"]').href;
            arr.push(canal);
        }
        return arr;
    })

    // Recorrer Recomendados
    for (let recomendado of recomendadosList) {
        await page.goto(recomendado.url);
        await page.waitForSelector('[data-a-target="stream-title"]');

        // Guardar Datos Stream
        recomendado.description = await page.evaluate(() => document.querySelector('[data-a-target="stream-title"]').innerText);
        recomendado.streamTime = await page.evaluate(() => document.querySelector('[aria-label="Tiempo dedicado a streamear en directo"]').innerText);
        recomendado.gameLink =  await page.evaluate(() => document.querySelector('[data-a-target="stream-game-link"]').href);
        await page.screenshot({
            quality: 100,
            path: `./images/channel/${recomendado.name}.jpg`
        });
        await timeout(1000);

        // Screenshot de la Pagina Categoria
        await page.goto(recomendado.gameLink);
        await page.screenshot({
            quality: 100,
            path: `./images/category/${recomendado.category}.jpg`
        });
        await timeout(1000);
    }

    // Guardar datos en un Excel
    var wb = new xl.Workbook();
    let nombreArchivo = "DatosRecomendado";
    var ws = wb.addWorksheet(nombreArchivo);

    // Crear Stilos
    var estiloInicioColumna = wb.createStyle({
        font: {
            name: "Arial",
            color: '#000000',
            size: 12,
            bold: true,
        },
        numberFormat: '$#,##0.00; ($#,##0.00); -',
    });
    
    var estiloContenido = wb.createStyle({
        font: {
            name: "Arial",
            color: '#494949',
            size: 11,
        },
        numberFormat: '$#,##0.00; ($#,##0.00); -',
    });

    // Cabeceras
    ws.cell(1, 1).string("Name").style(estiloInicioColumna);
    ws.cell(1, 2).string("Image").style(estiloInicioColumna);
    ws.cell(1, 3).string("Category").style(estiloInicioColumna);
    ws.cell(1, 4).string("Viewers").style(estiloInicioColumna);
    ws.cell(1, 5).string("URL").style(estiloInicioColumna);
    ws.cell(1, 6).string("Description").style(estiloInicioColumna);
    ws.cell(1, 7).string("StreamTime").style(estiloInicioColumna);
    ws.cell(1, 8).string("GameLink").style(estiloInicioColumna);

    // Meter Datos de RecomendadosList en Excel
    let fila = 2;
    recomendadosList.forEach(recomendado => {
        ws.cell(fila, 1).string(recomendado.name).style(estiloContenido);
        ws.cell(fila, 2).string(recomendado.image).style(estiloContenido);
        ws.cell(fila, 3).string(recomendado.category).style(estiloContenido);
        ws.cell(fila, 4).string(recomendado.viewers).style(estiloContenido);
        ws.cell(fila, 5).string(recomendado.url).style(estiloContenido);
        ws.cell(fila, 6).string(recomendado.description).style(estiloContenido);
        ws.cell(fila, 7).string(recomendado.streamTime).style(estiloContenido);
        ws.cell(fila, 8).string(recomendado.gameLink).style(estiloContenido);
        fila = fila + 1;
    })

    // Guardar Excel
    const pathExcel = path.join(__dirname, 'excel', nombreArchivo + '.xlsx')
    wb.write(pathExcel);

    // TODO:
    /*
    // Mostrar Datos de Excel o DB
    // Volcar datos en HTML 
    */
    // Fin TODO

    // Mostrar Datos
    console.log("Recomendados____________________________________________________________________________________");
    console.log(recomendadosList);
    console.log("________________________________________________________________________________________________\n");

    // Atributos Canal a Buscar
    const channelName = "habie347";
    const categoryName = "FIVE NIGHTS AT FREDDY'S: HELP WANTED"
    const videoName = "Say hi to YouTube !gg"

    // Recargar Pagina Twitch
    await page.goto('https://www.twitch.tv/');

    // Buscar Canal
    await page.waitForSelector('[data-a-target="tw-input"]');
    await page.type('[data-a-target="tw-input"]', channelName);
    await page.keyboard.press('Enter');
    await timeout(3000);
    await page.waitForSelector(`[alt="${channelName}"]`);
    await page.click(`[alt="${channelName}"]`)
    console.log(channelName);

    // Buscar Categoria del VOD
    // await timeout(2000);
    await page.waitForSelector(`[data-a-target="tw-card-title"]`);
    await page.click(`[title="${categoryName}"]`)
    console.log(categoryName);

    // Cargar VOD
    await page.waitForSelector(`[data-a-target="video-tower-card-1"]`);
    await page.click(`[title="${videoName}"]`);
    await page.waitForSelector('[data-a-target="stream-title"]');
    console.log("En directo");

    // Esperar a que el VOD Termine:
    await page.waitForSelector(`[data-a-target="player-seekbar-duration"]`);
    await timeout(500);
    var timeEnd = await page.evaluate(() => document.querySelector('[data-a-target="player-seekbar-duration"]').innerText);
    console.log("Time end: "+ timeEnd);
    var timeSplit = timeEnd.split(':');
    var hora = timeSplit[0] * 3600;
    var min = timeSplit[1] * 60;
    var sec = timeSplit[2] * 1;
    var timeMilisecs = (hora + min + sec) * 1000;

    console.log("Time seconds: "+ timeMilisecs);
    await timeout(timeMilisecs);
    console.log("Fin directo");
    

    // Cerrar Programa
    await timeout(5000);
    console.log("Cerrando Programa");
    await browser.close();

    
})();

const timeout = (milliseconds) => {
    return new Promise (resolve => {
        setTimeout(resolve, milliseconds);
    })
}