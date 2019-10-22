import MessageHandler from "../messageHandler";
import ExtendedInfo from "../extendedInfo";
import TwitchExtendedInfo from "../extendedInfos/twitchExtendedInfo";
import MessageFloodgate from "../messageFloodgate";
import * as Discord from "discord.js";
import DiscordExtendedInfo from "../extendedInfos/discordExtendedInfo";
import fetch from "node-fetch";
import * as fs from "fs";

function readSettings(): Promise<string> {
	return new Promise((resolve, reject) => {
		fs.readFile("resources/imgur.json", "utf8", (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		})
	});
}
interface Card {
	card_id: number,
	card_name: string,
	clan: number,
	tribe_name: string,
	skill_disc: string,
	evo_skill_disc: string,
	cost: number,
	atk: number,
	life: number,
	evo_atk: number,
	evo_life: number,
	rarity: number,
	char_type: number,
	card_set_id: number,
	description: string,
	evo_description: string,
	base_card_id: number,
	normal_card_id: number,
	use_red_ether: number,
	format_type: number,
	org_skill_disc: string,
	org_evo_skill_disc: string,
	restricted_count: number,
	skill: string,
	skill_option: string
}

interface CardCount {
    [details: string] : number;
} 

interface Alias {
	[alias: string] : string;
}

enum Craft {
    Neutral = 0,
	Forestcraft,
	Swordcraft,
	Runecraft,
	Dragoncraft,
	Shadowcraft,
	Bloodcraft,
	Havencraft,
	Portalcraft
}

enum Rarity {
	Bronze = 1,
	Silver,
	Gold,
	Legendary
}

enum PrettyFormat {
	"Unlimited" = 0,
	"Rotation" = 1
}

enum Set {
	"Basic Card" = 10000,
	"Classic",
	"Darkness Evolved",
	"Rise of Bahamut",
	"Tempest of the Gods",
	"Wonderland Dreams",
	"Starforged Legends",
	"Chronogenesis",
	"Dawnbreak, Nightedge",
	"Brigade of the Sky",
	"Omen of the Ten",
	"Altersphere",
  "Steel Rebellion",
  "Rebirth of Glory",
  "Verdant Conflict",
	"Promotional" = 70000,
	"Token" = 90000
}

class SVLookup implements MessageHandler {

	private _cards: Card[];
	private _imgurToken: string;
	static aliases: Alias = {
		//Basic
		"weebblader": "ta-g, katana unsheathed",
		"dg": "dark general",
		//Classic
		"ding dong": "bellringer angel",
		"ptp": "path to purgatory",
		"satan": "prince of darkness",
		"stan": "prince of darkness",
		"epm": "elven princess mage",
		"rosetta": "rose queen",
		"dshift": "dimension shift",
		"awoo": "cerberus",
		"atomeme": "lord atomy",
		//DE
		"old levi": "timeworn mage levi",
		"dod": "dance of death",
		"beelzebub": "lord of the flies",
		//RoB
		"no mere duck": "hamsa",
		"coc": "call of cocytus",
		"jo pendant": "dragonclaw pendant",
		"tribunal of rigged evil": "tribunal of good and evil",
		//TotG
		"jungle albert": "jungle warden",
		"pepe": "vagabond frog",
		"succ": "support cannon",
		"mutabolt": "mutagenic bolt",
		"eggs": "dragon's nest",
		"candle": "candelabra of prayers",
		"squidward": "octobishop",
		//WLD
		"ursula": "queen of the dread sea",
		"eta": "elf twins' assault",
		"tokenfucker9000": "wood of brambles",
		"happy tree": "kindly treant",
		"bnb": "beauty and the beast",
		"cock": "council of card knights",
		"antiguy": "hero of antiquity",
		"heroic guy": "hero of antiquity",
		"hero of guy": "hero of antiquity",
		"young levi": "master mage levi",
		"yung levi": "master mage levi",
		"bkb": "big knuckle bodyguard",
		"caboose": "carabosse",
		//SFL
		"rta": "round table assembly",
		"gas bird": "andrealphus",
		"peacock": "andrealphus",
		"gold sibyl": "ceres of the night",
		"jormongoloid": "jormungand",
		"pdk": "prime dragon keeper",
		//Chronogenesis
		"big dong": "shining bellringer angel",
		"super dong": "shining bellringer angel",
		"ffg": "fall from grace",
		"tempest lancer": "lancer of the tempest",
		"aurelia alter": "darksaber melissa",
		"skill ring": "skull ring",
		"shadow albert": "underworld ruler aisha",
		"pure anal": "pure annihilation",
		"desu xd": "deus ex machina",
		"gun": "god bullet golem",
		//DBNE
		"smartacus": "spartacus",
		"skyboat": "sky fortress",
		"dfb": "darkfeast bat",
		"ptp with legs": "hinterland ghoul",
		"tenko cannon": "tenko's shrine",
		"friend cannon": "tenko's shrine",
		//Brigade
		"lego fighter": "legendary fighter",
		"uncle": "cagliostro, adorable genius",
		"potato": "arulumaya, mystic seer",
		"dlf": "de la fille, gem princess",
		//Omen
		"jerry": "mjerrabaine, omen of one",
		"better candle": "city of gold",
		"fat guy": "marwynn, omen of repose",
		//Altersphere
		"rune albert": "zealot of truth",
		//SR
		"shadow sibyl": "ceres, eternal bride",
		"yeehaw": "dragon ranch",
		//memes
		"the wife": "hot garbage"
	};
	private flagHelp: String = "{{a/cardname}} - display card **a**rt\n" + 
		"{{e/cardname}} - **e**volved card art\n" +
		"{{l/cardname}} - display **l**ore / flavor text\n" +
		"{{sc/cardname}} - Show card **sc**ript\n" + 
		"{{s/text}} - **s**earch card text\n" +
		"{{sr/text}} - **s**earch **r**otation cards\n" +
		"{{d/deckcode}} - Display **d**eck\n" +
		"{{topdeck}} - Random card\n"
	
	private constructor(cards: Card[], imgurToken: string) {
		this._cards = cards;
		this._imgurToken = imgurToken;
	}

	public static async create() {
    console.log("Getting cards...");
		const request = await fetch(`https://shadowverse-portal.com/api/v1/cards?format=json&lang=en`);
		const json = await request.json();
    const cards = (json.data.cards as Card[]).filter(x => x.card_name != null);
    for (let c of cards) { // keyword highlighting and dealing with malformed api data
      c.card_name = c.card_name.replace("\\", "").trim();
      c.org_skill_disc = SVLookup.orgescape(c.org_skill_disc).trim();
      c.org_evo_skill_disc = SVLookup.orgescape(c.org_evo_skill_disc).replace(/\n\(This card will be treated as .*$/g, "").trim();
      c.description = SVLookup.escape(c.description);
      c.evo_description = SVLookup.escape(c.evo_description)
		}
		console.log(`Starting SVLookup with ${cards.length} cards`);
		const data = await readSettings();
		const id = JSON.parse(data).id;
		return new SVLookup(cards, id);
	}

	static rotation_legal(c: Card) {
		return c.format_type;
	}

	static orgescape(text: String) {
		text = text.replace(/\[\/?b\]\[\/?b\]/g, "")
			.replace(/\[\/?b\]/g, "**")
			.replace(/<br>/g, "\n")
			.replace("----------", "─────────")
			.replace(/\s\n/g, "\n");
		return text;
	}
	
	static escape(text: String) { // i hate all of this
		let r = /\\u([\d\w]{4})/gi;
		text = text.replace(/<br>/g, "\n")
			.replace(/\\n/g, "\n")
			.replace(/\\\\/g, "")
			.replace("&#169;", "©")
			.replace("----------", "─────────")
			.replace(/\s\n/, "\n")
			.replace(r, function (match, grp) {
				return String.fromCharCode(parseInt(grp, 16));
			});
		return decodeURIComponent(text as string);
	}

	private memes(card: Card) {
		if (card.card_name == "Jolly Rogers") {
			card.card_name = "Bane Rogers";
			card.org_skill_disc = "**Fanfare:** Randomly gain **Bane**, **Bane** or **Bane**.";
		}
		return card;
	}
	
	async sendError(error: String, description: String, discordInfo: DiscordExtendedInfo) {
		await discordInfo.message.channel.send({embed: {
			color: 0xD00000,
			title: error,
			description: description
		}});
	}
	
	async handleMessage(responder: (content: string) => Promise<void>, content: string, info: ExtendedInfo | undefined) {
		if (info == undefined || info.type != "DISCORD")
			return;
		
		content = content.toLowerCase();
		const matches = content.match(/{{[a-z0-9-\+',\?!\/\s\(\)]+}}/g);
		if (matches == null)
			return;

		for (let m of matches) {
			let target = m.slice(2, -2)
			const optionMatches = target.match(/^[a-z0-9]{1,2}(?=\/)/);
			let options = "";
			if (optionMatches != null) {
				options = optionMatches[0].toString();
				target = target.replace(options + "/", "");
			}

			const discordInfo = info as DiscordExtendedInfo;

			if ((target == "help" || target == "?") && options == "") {
				this.sendError("Find cards by typing their name in double brackets, like {{Bahamut}} or {{baha}}.", this.flagHelp, discordInfo);
				continue;
			}

			if (options == "s" || options == "sr") {
				let results = this._cards.filter(x => 
						x.skill_disc.toLowerCase().includes(target) ||
						x.evo_skill_disc.toLowerCase().includes(target) ||
						x.tribe_name.toLowerCase().includes(target) || 
						x.card_name.toLowerCase().includes(target))
					.reduce<Card[]>((acc, val) => acc.find(x => x.card_name == val.card_name) ? acc : [...acc, val], []);
				if (options == "sr")
					results = results.filter(x => SVLookup.rotation_legal(x));
				if (results.length == 0) {
					await this.sendError(`No cards contain the text "${target}".`, "", discordInfo);
					continue;
				} else if (results.length == 1) {
					options = "";
					target = results[0].card_name.toLowerCase();
				} else {
					let embed = new Discord.RichEmbed().setColor(0xF6C7C7);
					let earlyout = false;
					for(let c = 0; c <= 8; c++) {
						const matchTitles = results.filter(x => x.clan == c).reduce<string>((acc, val) => acc + val.card_name + " - ", "").slice(0, -2);
						if (matchTitles != "") {
							if (matchTitles.length <= 1024)
								embed.addField(Craft[c], matchTitles, false);
							else {
								await this.sendError("Too many matches. Please be more specific.", "", discordInfo);
								earlyout = true;
								break;
							}
						}
					}
					if (!earlyout)
						await discordInfo.message.channel.send({embed});
					continue;
				}
			}

			if (options == "d") {
				const request = await fetch(`https://shadowverse-portal.com/api/v1/deck/import?format=json&deck_code=${target}&lang=en`);
				const json = await request.json();
				if (json.data.errors.length == 0) {
          const hash = json.data.hash;
					const embed = new Discord.RichEmbed();
					const deckRequest = await fetch(`https://shadowverse-portal.com/api/v1/deck?format=json&hash=${hash}&lang=en`);
          const rawJson = await deckRequest.json();
					const deckJson = rawJson.data.deck;
					const deck = (deckJson.cards as Card[]);
					const vials = deck.map(x => x.use_red_ether).reduce((a, b) => a + b, 0);
          const format = deck.every(x => x.format_type == 1);
          let formatString = "Unlimited"
          if (deckJson.deck_format == 2) {
            formatString = "Take Two";
          } else if (deckJson.deck_format == 4) {
            formatString = "Open 6";
          } else if (format) {
            formatString = "Rotation";
          }
					const deckImage = await fetch('https://shadowverse-portal.com/image/1?lang=en', {
						headers: {'Referer': "https://shadowverse-portal.com/deck/" + hash + "?lang=en"}
					});
					const imgurReupload = await fetch('https://api.imgur.com/3/image', {
						method: "POST",
						headers: {'Authorization': "Client-ID " + this._imgurToken},
						body: deckImage.body
					});
					const imgurJSON = await imgurReupload.json();
					embed.setFooter(`Deck code expired? Click the link to generate another.`)
						.setTitle( `${Craft[deckJson.clan]} Deck - ${target}`)
						.setFooter(`${formatString} Format - ${vials} vials - Click link to generate new deck code`)
						.setImage(imgurJSON.data.link)
						.setURL(`https://shadowverse-portal.com/deck/${hash}`)
						.setColor(0xF6C7C7);
					await discordInfo.message.channel.send({embed});
				} else {
					await this.sendError(json.data.errors[0].message, "", discordInfo);
				}
				continue;
			}

			if (Object.keys(SVLookup.aliases).includes(target))
				target = SVLookup.aliases[target];

			 if (target.toLowerCase() == "topdeck")
                target = this._cards[Math.floor( Math.random() * this._cards.length)].card_name.toLowerCase();

			let cards = this._cards.filter(x => x.card_name.toLowerCase().includes(target));
			if (cards.length < 1) {
				await this.sendError(`"${target}" doesn't match any cards. Check for spelling errors?`, "", discordInfo);
				continue;
			}
			let card;
			if (cards.length > 1) {
				let fullword = cards.filter(x => x.card_name.toLowerCase().match(`(^|\\s)${target},?($|\\s)`));
				if (fullword.length > 0)
					cards = fullword;
				if (cards.length > 1) {
					let provisional = cards.filter(x => x.card_name.toLowerCase() == target);
					if (provisional.length > 0)
						cards = provisional;
				}
				if (cards.every(x => x.card_name == cards[0].card_name)) {
					if (cards.length > 1) {
						cards = cards.filter(x => x.card_set_id != 90000);
						cards = cards.filter(x => x.card_set_id.toString()[0] != "7");
						cards = cards.reduce<Card[]>((acc, val) => acc.find(x => x.card_set_id > val.card_set_id) ? acc : [val], []);
					}
				}
				if (cards.length == 1)
					card = cards[0];
				if (!card) {
					if (cards.length <= 6) {
						cards = cards.filter((obj, pos, arr) => {
							return arr.map(x => x.card_name).indexOf(obj.card_name) === pos;
						});;
						const matchTitles = cards.reduce<string>((acc, val) => acc + "- " + val.card_name + " _(" +  Set[val.card_set_id] + ")_\n", "");
						await this.sendError(`"${target}" matches multiple cards. Could you be more specific?`, matchTitles, discordInfo);
					} else {
						await this.sendError(`"${target}" matches a large number of cards. Could you be more specific?`, "", discordInfo);
					}
					continue;
				}
			} else {
				card = cards[0];
			}

			let copiedCard = Object.assign({}, card);
			card = this.memes(copiedCard); // keeps meme changes out of card db, not sure if this is 100% the right way

			let cardname = card.card_name; // TODO: figure out why i can't access the card object from filter statements
			if (card.base_card_id != card.normal_card_id) { // alternates now have tossup set IDs, big mess
				let baseID = card.base_card_id; // TODO: filter syntax
				let realcard = this._cards.filter(x => x.card_id == baseID)[0];
				card.card_set_id = realcard.card_set_id;
			}
			let embed = new Discord.RichEmbed().setTitle(card.card_name);

			switch (card.rarity) {
				case Rarity.Bronze: {
					embed.setColor(0xCD7F32);
					break;
				}
				case Rarity.Silver: {
					embed.setColor(0xC0C0C0);
					break;
				}
				case Rarity.Gold: {
					embed.setColor(0xFFD700);
					break;
				}
				case Rarity.Legendary: {
					embed.setColor(0xB9F2FF);
					break;
				}
			}

			switch (options) {
				case "a":
				case "e":
				case "a2":
				case "e2":
				case "a3":
				case "e3": {
					let evolved = ["e", "e2", "e3"].includes(options);
					let alternate = 0;
					if (["a2", "e2"].includes(options))
						alternate = 1;
					if (["a3", "e3"].includes(options))
						alternate = 2;
					let matches = this._cards.filter(x => x.card_name == cardname).length
					if (card.base_card_id != card.normal_card_id) { // alternate reprints (Ta-G, AGRS, etc)
						let baseID = card.base_card_id; // TODO: filter syntax
						let newcard = this._cards.filter(x => x.card_id == baseID)[0];
						if (newcard.card_name != card.card_name) {
							alternate = 1;
							card = newcard;
						}
					} else if (alternate != 0 && matches <= alternate) {
						await this.sendError(`Couldn't find additional art for "${card.card_name}".`, "", discordInfo);
						continue;
					}
					if (card.char_type != 1 && evolved) {
						await this.sendError(`"${card.card_name}" doesn't have evolved art.`, "", discordInfo);
						continue;
					}
					// const cleanName = card.card_name.toLowerCase().replace(/\W/g, '').trim();
					embed.setImage("http://sv.bagoum.com/getRawImage/" + (evolved ? "1" : "0") + "/" + (alternate) + "/" + card.base_card_id);
					if (matches > 1 && !alternate)
						embed.setFooter(`Alt art available! Try "a2" or "e2"`);
					if (matches > 2 && alternate == 1)
						embed.setFooter(`Additional art available! Try "a3" or "e3"`);
					break;
				}
				case "f":
				case "l": {
					embed.setThumbnail(`https://shadowverse-portal.com/image/card/en/C_${card.card_id}.png`);
					if (card.char_type == 1)
						embed.setDescription("*" + card.description + "\n\n" + card.evo_description + "*");
					else
						embed.setDescription("*" + card.description + "*");
					break;
				}
				case "sc": {
					discordInfo.message.channel.send("Script dump for **" + card.card_name + "** - `" + card.skill + "`\n\n```" + card.skill_option
						.replace(/,/g, ",\n")
						.replace(/\(/g, "\n	(")
						.replace(/&/g, "\n		&") +
						"```");
					return;
				}
				case "": {
					let legality = "(" + PrettyFormat[card.format_type] + ")";
					if (card.card_set_id == Set["Token"])
						legality = "";
					let sanitizedTribe = (card.tribe_name == "-") ? "" : `(${card.tribe_name})`;
					embed.setURL(`http://sv.bagoum.com/cards/${card.card_id}`)
					.setThumbnail(`https://sv.bagoum.com/cardF/en/c/${card.card_id}`)
					.setFooter(Craft[card.clan] + " " + Rarity[card.rarity] + " - " + Set[card.card_set_id] + " " + legality);
					switch (card.char_type) {
						case 1: {
							let description = `${card.atk}/${card.life} ➤ ${card.evo_atk}/${card.evo_life} - ${card.cost}PP Follower ${sanitizedTribe}`;
							if (card.base_card_id != card.normal_card_id) {
								let baseID = card.base_card_id; // TODO: filter syntax
								let realcard = this._cards.filter(x => x.card_id == baseID)[0];
								if (realcard.card_name != card.card_name)
									description += `\n_This card is treated as ${realcard.card_name}._`;
							}
							description += `\n\n${card.org_skill_disc}`;
							embed.setDescription(description);
							if (card.org_evo_skill_disc != card.org_skill_disc
								&& card.org_evo_skill_disc != ""
								&& !(card.org_skill_disc.includes(card.org_evo_skill_disc))
								&& card.org_evo_skill_disc != "(Same as the unevolved form.)") {
								embed.addField("Evolved", card.org_evo_skill_disc, true);
							}

							break;
						}
						case 2:
						case 3: {
							embed.setDescription(`${card.cost}PP Amulet ${sanitizedTribe}\n\n` + card.org_skill_disc);
							break;
						}
						case 4: {
							embed.setDescription(`${card.cost}PP Spell ${sanitizedTribe}\n\n` + card.org_skill_disc);
							break;
						}
					}
					if (card.restricted_count < 3)
						embed.description = `_Restricted${card.format_type ? " in Unlimited!" : "!"} Limit ${card.restricted_count} cop${(card.restricted_count > 1 ? "ies" : "y")} per deck._\n` + embed.description;
					break;
				}
				default: {
					await this.sendError(`"${options}" is not a valid options flag. Try one of these.`, this.flagHelp, discordInfo);
					continue;
				}

			}

			embed.setURL(`http://sv.bagoum.com/cards/${card.card_id}`); // done late to account for jank altarts
	
			await discordInfo.message.channel.send({embed});
		}
	}

}

export default SVLookup;
