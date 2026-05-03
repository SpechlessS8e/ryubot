const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const prism = require('prism-media');
const http = require('http');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

function playSilence(connection) {
  const player = createAudioPlayer();

  const silence = new prism.opus.Encoder({
    rate: 48000,
    channels: 2,
    frameSize: 960
  });

  const resource = createAudioResource(silence, { inputType: 'opus' });
  player.play(resource);
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    playSilence(connection);
  });
}

function connect() {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    const connection = joinVoiceChannel({
      channelId: CHANNEL_ID,
      guildId: GUILD_ID,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false
    });

    playSilence(connection);

    connection.on('stateChange', (_, newState) => {
      if (newState.status === 'disconnected' || newState.status === 'destroyed') {
        setTimeout(connect, 1000);
      }
    });

  } catch {
    setTimeout(connect, 2000);
  }
}

client.once('ready', () => {
  connect();

  setInterval(() => {
    const conn = getVoiceConnection(GUILD_ID);
    if (!conn) connect();
  }, 10000);
});

client.on('shardDisconnect', () => setTimeout(connect, 1000));
client.on('error', () => setTimeout(connect, 1000));

client.login(TOKEN);

// required for Render to stay awake
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('ok');
}).listen(3000);