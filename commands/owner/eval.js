const capcon = require('capture-console');
const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const allowed = ["956156042398556210", "675492571203764236"];
const trim = (str, max) => (str.length > max ? `${str.slice(0, max - 3)}...` : str);
const stripAnsiCodes = str => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

const clean = async (text, interaction) => {
    if (text && text.constructor.name == "Promise")
        text = await text;

    if (typeof text !== "string")
        text = require("util").inspect(text, { depth: 1 });

    text = text.replace(/`/g, "`" + String.fromCharCode(8203));
    text = text.replaceAll(interaction.client.token, "[REDACTED]");

    return text;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setDescription('evaluation. you evaluator. you')
        .addBooleanOption(option =>
            option.setName('no_embed')
                .setDescription('output the result without an embed')
                .setRequired(false)),
    async execute(interaction) {
        if (!allowed.includes(interaction.user.id)) return interaction.editReply("how dare you even TRY to use this command you mere mortal");
        const modal = new ModalBuilder()
            .setCustomId('evalModel')
            .setTitle('Eval');

        const codeInput = new TextInputBuilder()
            .setCustomId('codeInput')
            .setLabel("Enter code:")
            .setStyle(TextInputStyle.Paragraph);

        const code = new ActionRowBuilder().addComponents(codeInput);
        modal.addComponents(code);

        await interaction.showModal(modal);
        const submitted = await interaction.awaitModalSubmit({
            time: 2147483647,
        }).catch(error => {
            console.error(error);
            return null;
        });
        await submitted.deferReply();
        var output = '';
        capcon.startCapture(process.stdout, function (stdout) {
            output += stdout;
        });
        try {
            // Evaluate (execute) our input
            let codeText = submitted.fields.getTextInputValue('codeInput');
            await eval(codeText);

            // Put our eval result through the function
            // we defined above
            const cleaned = await clean(output, interaction);

            if (output !== '') {
                if (!interaction.options.getBoolean("no_embed")) {
                    await submitted.editReply({
                        embeds: [
                            {
                                title: "Eval Result",
                                fields: [
                                    {
                                        name: "Input",
                                        value: `\`\`\`js\n${trim(submitted.fields.getTextInputValue('codeInput'), 1024)}\n\`\`\``
                                    },
                                    {
                                        name: "Output",
                                        value: `\`\`\`xz\n${stripAnsiCodes(trim(cleaned, 1024))}\n\`\`\``
                                    }
                                ],
                                color: 0x00ff00
                            }
                        ]
                    });
                } else {
                    await submitted.editReply(trim(cleaned, 1024));
                }
            } else {
                await submitted.deleteReply();
            }
        } catch (err) {
            if (!interaction.options.getBoolean("no_embed")) {
                await submitted.editReply({
                    embeds: [
                        {
                            title: "Eval Result",
                            fields: [
                                {
                                    name: "Input",
                                    value: `\`\`\`js\n${trim(submitted.fields.getTextInputValue('codeInput'), 1024)}\n\`\`\``
                                },
                                {
                                    name: "Output",
                                    value: `\`\`\`ansi\n\u001b[31m${trim(err.stack, 1024)}\u001b[0m\n\`\`\``
                                }
                            ],
                            color: 0xff0000
                        }
                    ]
                });
            } else {
                await submitted.editReply(trim(err, 1024));
            }
        }
        capcon.stopCapture(process.stdout);
    },
};
