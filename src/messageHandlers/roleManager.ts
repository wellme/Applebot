import MessageHandler from "../messageHandler";
import ExtendedInfo from "../extendedInfo";
import DiscordExtendedInfo from "../extendedInfos/discordExtendedInfo";
import { Message } from "discord.js";

class RoleManager implements MessageHandler {

	public async cleanUpRoles(msg: Message) {
		for (let r of msg.guild.roles) {
			if (r[1].name.startsWith("@"))
				if (r[1].members.size == 0) {
					r[1].delete();
				}
		}
	}

	public roleSanitizer(args: String[]): string {
		return "@" + args.slice(2).join(" ").toLowerCase();
	}

	async handleMessage(responder: (content: string) => Promise<void>, content: string, info: ExtendedInfo | undefined) {
		if (info == undefined || info.type != "DISCORD")
			return;
		const discordInfo = info as DiscordExtendedInfo;
		const msg = discordInfo.message;
		let args = content.split(" ");

		if (args[0] != "!role")
			return;
		if (msg.guild.name != "HITBOX DIMENSION" && msg.guild.name != "bot testing fuckery") // don't worry about it
			return;

		switch (args[1].toLowerCase()) {
			case "add": {
				if (args.length > 2) {
					const roleText = this.roleSanitizer(args);
					let targetRole = msg.guild.roles.find(role => role.name === roleText);
					if (targetRole) {
						if (msg.member.roles.has(targetRole.id)) {
							await responder(`You already have \`${roleText}\`.`)
							return;
						}
						await msg.member.addRole(targetRole);
						await responder(`OK! I've added you to \`${roleText}\`.`);
					} else {
						await responder(`Couldn't find a role named \`${roleText}\`.`)
					}
				} else {
					await responder('Usage: `!role add [name of role]`');
				}
				break;
			}
			case "remove": {
				if (args.length > 2) {
					const roleText = this.roleSanitizer(args);
					let targetRole = msg.guild.roles.find(role => role.name === roleText);
					if (targetRole) {
						if (!msg.member.roles.has(targetRole.id)) {
							await responder(`You don't have that role.`);
							return;
						}
						await msg.member.removeRole(targetRole);
						await responder(`OK! I've removed you from \`${roleText}\`.`);
					} else {
						await responder(`Couldn't find a role named \`${roleText}\`.`)
					};

				} else {
					await responder('Usage: `!role remove [name of role]`');
				}
				break;
			}
			case "create": {
				if (args.length > 2) {
					const roleText = this.roleSanitizer(args);
					let dupeRole = msg.guild.roles.find(role => role.name === roleText);
					if (dupeRole) {
						if (msg.member.roles.has(dupeRole.id)) {
							await responder(`\`${roleText}\` already exists.`);
							return;
						} else {
							msg.member.addRole(dupeRole);
							await responder(`\`${roleText}\` already exists. I've added you to it.`);
							return;
						}
					}
					const result = await discordInfo.message.guild.createRole({
						name: roleText,
						hoist: false,
						mentionable: true
					});
					await msg.member.addRole(result);
					const newRole = { id: result.id, added_by: discordInfo.message.author.username };
					await responder(`OK! Added \`${roleText}\`, and added you to that role.`);
				} else {
					await responder('Usage: `!role create [name of role]`');
				}
				break;
			}
			case "list": {
				let roleString = "Roles: "
				for (let r of msg.guild.roles) {
					if (r[1].name.startsWith("@"))
						roleString += "`" + r[1].name + "` ";
				}
				await responder(roleString);
				break;
			}
			case "removeall": {
				for (let r of msg.member.roles) {
					if (r[1].name.startsWith("@"))
						await msg.member.removeRole(r[1]);
				}
				await responder(`OK! I've removed you from all user-created roles.`);
				this.cleanUpRoles(msg);
				break;
			}
			default: {
				await responder('Usage: `!role <create, add, remove, removeall>`');
			}
		}
	}

}

export default RoleManager;