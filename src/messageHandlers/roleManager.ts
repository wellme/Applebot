import MessageHandler from "../messageHandler";
import ExtendedInfo from "../extendedInfo";
import DiscordExtendedInfo from "../extendedInfos/discordExtendedInfo";
import MessageFloodgate from "../messageFloodgate";
import * as fs from "fs";
import { Message } from "discord.js";

interface Role {
	"id": string;
	"added_by": string;
}

function readRoleFile(): Promise<string | undefined> {
	return new Promise((resolve, reject) => {
		fs.readFile("resources/roleManager.json", "utf8", (err, data) => {
			if (err) {
				if (err.code === "ENOENT") {
					resolve();
				} else {
					reject(err);
				}
			} else {
				resolve(data);
			}
		})
	});
}

function writeRoleFile(roles: Role[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const content = JSON.stringify(roles);
		fs.writeFile("resources/roleManager.json", content, "utf8", function (err) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		})
	});
}

class RoleManager implements MessageHandler {

	private _roles: Role[];

	private constructor(roles: Role[]) {
		this._roles = roles;
	}

	public static async create() {
		const data = await readRoleFile() || "[]";
		const quotes = JSON.parse(data) as Role[];
		return new RoleManager(quotes);
	}

	public async cleanUpRoles(msg: Message) {
		for (let r of this._roles) {
			let targetRole = msg.guild.roles.find(role => role.id === r.id);
			if (targetRole) {
				if (targetRole.members.size == 0)
					targetRole.delete();
			} else {
				this._roles = this._roles.filter(x => x.id == r.id);
				writeRoleFile(this._roles);
			}
		}
	}

	async handleMessage(responder: (content: string) => Promise<void>, content: string, info: ExtendedInfo | undefined) {
		if (info == undefined || info.type != "DISCORD")
			return;
		const discordInfo = info as DiscordExtendedInfo;
		const msg = discordInfo.message;
		let args = content.split(" ");
		console.log(msg.guild.name);

		if (args[0] != "!role")
			return;
		if (msg.guild.name != "HITBOX DIMENSION" && msg.guild.name != "bot testing fuckery") // don't worry about it
			return;

		switch (args[1].toLowerCase()) {
			case "add": {
				if (args.length > 2) {
					const roleText = args.slice(2).join(" ");
					let targetRole = msg.guild.roles.find(role => role.name === roleText);
					if (targetRole) {
						if (this._roles.find(x => x.id == targetRole.id)) {
							await msg.member.addRole(targetRole);
							await responder(`OK! I've added you to \`${roleText}\`.`);
						} else {
							await responder(`[hacker voice] i'm in`);
						}
					} else {
						await responder(`Couldn't find a role named \`${roleText}\`.`)
					}
				} else {
					await responder('Usage: "!role add [name of role]"');
				}
				break;
			}
			case "remove": {
				if (args.length > 2) {
					const roleText = args.slice(2).join(" ");
					let targetRole = msg.guild.roles.find(role => role.name === roleText);
					if (targetRole) {
						if (!msg.member.roles.has(targetRole.id)) {
							await responder(`You don't have that role.`)
							return;
						}
						if (this._roles.find(x => x.id == targetRole.id)) {
							await msg.member.removeRole(targetRole);
							await responder(`OK! I've removed you from \`${roleText}\`.`);
							this.cleanUpRoles(msg);
						} else {
							await responder(`[hacker voice] i'm in`);
						}
					} else {
						await responder(`Couldn't find a role named \`${roleText}\`.`)
					};

				} else {
					await responder('Usage: "!role remove [name of role]"');
				}
				break;
			}
			case "create": {
				if (args.length > 2) {
					const roleText = args.slice(2).join(" ");
					let dupeRole = msg.guild.roles.find(role => role.name === roleText);
					if (dupeRole) {
						if (msg.member.roles.has(dupeRole.id)) {
							await responder(`\`${roleText}\` already exists.`);
						} else {
							msg.member.addRole(dupeRole);
							await responder(`\`${roleText}\` already exists. I've added you to it.`);
						}
					}
					const result = await discordInfo.message.guild.createRole({
						name: roleText,
						hoist: false,
						mentionable: true
					});
					await msg.member.addRole(result);
					const newRole = {id: result.id, added_by: discordInfo.message.author.username};
					this._roles.push(newRole);
					await responder(`OK! Added \`${roleText}\`, and added you to that role.`);
					await writeRoleFile(this._roles);
				} else {
					await responder('Usage: "!role create [name of role]"');
				}
				break;
			}
			case "list": {
				let roleString = "Roles: "
				for (let r of this._roles) {
					let targetRole = msg.guild.roles.get(r.id);
					if (targetRole)
						roleString += "`" + targetRole.name + "` ";
				}
				await responder(roleString);
				break;
			}
			case "removeall": {
				for (let r of this._roles) {
					let targetRole = msg.guild.roles.get(r.id);
					if (targetRole)
						await msg.member.removeRole(targetRole);
				}
				await responder(`OK! I've removed you from all user-created roles.`);
				this.cleanUpRoles(msg);
				break;
			}
			case "delete": {
				if (!msg.member.permissions.has("MANAGE_MESSAGES"))
					return;
				if (args.length > 2) {
					const roleText = args.slice(2).join(" ");
					let targetRole = msg.guild.roles.find(role => role.name === roleText);
					if (targetRole) {
						if (this._roles.find(x => x.id == targetRole.id)) {
							targetRole.delete();
							await responder(`Deleted role \`${roleText}\`.`)
						} else {
							await responder(`[hacker voice] i'm in`);
						}
					} else {
						await responder(``)
					};

				} else {
					await responder('Usage: "!role delete [name of role]"');
				}
				break;
			}
			default: {
				await responder('Usage: !role {create, add, remove, removeall}');
			}
		}
	}

}

export default RoleManager;