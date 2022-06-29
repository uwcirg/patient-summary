const {edit, editWebpackPlugin, getWebpackPlugin, appendWebpackPlugin} = require('@rescripts/utilities');

// This is a root rescript file.  Together with the rescripts CLI, it allows the default
// Create React App (CRA) configurations to be modified. 
// See: https://github.com/harrysolovay/rescripts

// Add support for worker loader
const addWorkerLoader = config => {
    return edit(
        module => {
            if (!module.rules) module.rules = [];
            module.rules.push({
                test: /\.worker\.js$/,
                use: { loader: "worker-loader" },
            });
            return module;
        },
        [['module']],
        config
    );
};

// Logs the config, mainly useful for debugging
const logConfig = config => {
    console.log(JSON.stringify(config, null, 2))
    return config
}

// The module.exports determines which scripts actually get run!
module.exports = [
    addWorkerLoader,
   // logConfig
];
