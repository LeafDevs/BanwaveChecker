const { Client, MessageEmbed, MessageAttachment } = require('discord.js');
const config = require('./config.json');
const fs = require("fs");
const axios = require('axios');
const jimp = require('jimp');
const bans = 0


const client = new Client({
    intents: 32679
});


client.on('ready', async () => {
    console.log(`${client.user.tag} is online!`)
    client.user.setActivity('Hypixel Bans', { type: 'WATCHING' })
    debug(`${client.user.tag} is online!`)
    await fetchBansNormal()
    setInterval(() => {
        fetchBansNormal()
    }, 900000)

});

async function setBansNumber() {
    const response = await axios.get('https://api.plancke.io/hypixel/v1/punishmentStats')
    const { staff_total } = response.data.record;
    this.bans = staff_total
}

async function fetchBansNormal() {
    try {
        const response = await axios.get('https://api.plancke.io/hypixel/v1/punishmentStats')
        const { staff_total, watchdog_lastMinute } = response.data.record;
        const diff = staff_total - this.bans
        this.bans = staff_total
        if(isNaN(diff)) {
            debug("Failed to fetch Bans. Ban Count is NaN Retrying..")
            console.log("Bans are NaN")
            setBansNumber()
            await fetchBansNormal()
            return
        }
        console.log(this.bans)
        console.log(diff)
        debug(`${diff} Ban(s) within 15 minutes.`)
        generateImage(staff_total, watchdog_lastMinute, diff)
        debug(`Creating Image....`)
    } catch(err) {
        debug(`Error setting bans: ${err}`)
        throw new Error(`Error setting bans: ${err}`)
    }
}

function get(list) {
    return list[Math.floor((Math.random()*list.length))];
  }
  

async function generateImage(bans, watchdog, diff) {
    const files = fs.readdirSync('./images').filter(file => file.endsWith('.png'));
    const image = await jimp.read(`./images/${get(files)}`);
    jimp.loadFont("./fonts/black/font.fnt").then(function (font) {
        image.print(font, 280, 100, `Ban Statistics For Last 15 Minutes:`);
        image.print(font, 500, 150, `Watchdog: ${watchdog}`);
        if(diff == NaN) {
            image.print(font, 490, 200, `Staff Bans: 0`);
        } else {
            image.print(font, 490, 200, `Staff Bans: ${diff}`);
        }

        image.print(font, 380, 350, `Embed Color Meaning:`);
        
        // save image
        image.write('./ban.png');
    });
    await jimp.loadFont("./fonts/green/font.fnt").then(function (font) {
        image.print(font, 480, 400, `OK - Below 10`);
        image.write('./ban.png');

    });
    await jimp.loadFont("./fonts/yellow/font.fnt").then(function (font) {
        image.print(font, 510, 450, `RISKY - 11-20`);
        image.write('./ban.png');
    });
    await jimp.loadFont("./fonts/orange/font.fnt").then(function (font) {
        image.print(font, 440, 500, `VERY RISKY - 21-29`);
        image.write('./ban.png');
    });
    await jimp.loadFont("./fonts/red/font.fnt").then(function (font) {
        image.print(font, 450, 550, `BAN WAVE - 30+`);
        image.write('./ban.png');
    });
    image.write('./ban.png');
    await console.log("Done!")
    await sendEmbed(diff)  
    debug("Finished Image Sending To Channel!")   

}

async function sendEmbed(diff) {
    console.log("Attempting to send embed")
    let channel = client.channels.cache.get(config.channelID)
    let embed = new MessageEmbed()
            .setTitle("Ban Wave Checker")
            .setImage("attachment://ban.png")
    if(diff <= 10) {
        embed.setColor("#024500")
    } else if(diff <= 20) {
        embed.setColor("#FFFF00")
    } else if(diff <= 29) {
        embed.setColor("#FFA500")
    } else if(diff >= 30) {
        embed.setColor("#FF0000")
    } else {
        embed.setColor("#03dffc")
    }
    channel.send({ embeds: [embed], files: ['./ban.png'] })
    // delete ban.png
    await fs.unlink('./ban.png', (err) => {
        try {
            debug("Successfully deleted ban.png")
        } catch(err) {
            debug("Failed to delete image. Issues May Occur!" + err);
            throw new Error("Failed to delete image. Issues May Occur!" + err);
        }
        
    });
}

async function debug(msg) {
    if(config.debug) {
        const debugchannel = client.channels.cache.get(config.debugChannelID)
        debugchannel.send(msg)
    }
}

client.login(config.token).then(() => {
    setBansNumber()
}).catch(err => {
    console.log(err)
})


