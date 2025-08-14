
const { gamesCommands, handleGamesCommand } = require('../games-system');

module.exports = {
    commands: gamesCommands,
    handleCommand: handleGamesCommand
};
