const {edit, editWebpackPlugin, getWebpackPlugin, appendWebpackPlugin} = require('@rescripts/utilities');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

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


// In development, it is similar, but each array also contains a Webpack hotloader.
const addLaunch = config => {
    return edit(
      entries => {
        // if (!Array.isArray(entries) || entries.filter(e => e.endsWith('/index.js')).length !== 1) {
        //   console.error('Cannot add launch.js to entry. Unexpected starting value for entry:', entries);
        //   return entries;
        // }
        return {
          main: entries,
          launch: entries.replace(/\/index.js$/, '/launch.js')
        }
      },
      [['entry']],
      config
    );
}

// Adds a new HtmlWebpackPlugin for launch.html.  It is configured the same as the index.html one,
// except the filename is "launch.html" and the chunks are ["launch"].
const addHtmlWebpackPluginForLaunch = config => {
    const indexPlugin = getWebpackPlugin('HtmlWebpackPlugin', config);
    if (indexPlugin == null || indexPlugin.options.filename !== 'index.html') {
      console.error('Cannot find HtmlWebpackPlugin for index.html to use as baseline for launch plugin.');
      return config;
    }
  
    const launchOptions = Object.assign({}, indexPlugin.options);
    launchOptions.filename = 'launch.html';
    launchOptions.chunks = ['launch'];
    return appendWebpackPlugin(
      new HtmlWebpackPlugin(launchOptions),
      config
    )
}

// Changes the output filename in development (not necessary in production).
// In development, this transforms:
//   output.filename: "static/js/bundle.js"
// to
//   output.filename: "static/js/[name].js"
const changeOutputFilenameForDev = config => {
  if (config.mode !== 'development') {
    return config;
  }
  return edit(
    filename => {
      if (!filename.endsWith('/bundle.js')) {
        console.error('Cannot modify output filename. Unexpected starting value:', filename);
        return filename;
      }
      return filename.replace(/\/bundle.js$/, '/[name].js');
    },
    [['output', 'filename']],
    config
  )
}

// Changes the existing HtmlWebpackPlugin for index.html to specify that it should use the main chunk.
// This production and development this transforms HtmlWebpackPlugin's:
//   options.chunks: "all"
// to
//   options.chunks: ["main"]
const editChunksInHtmlWebpackPluginForIndex = config => {
  return editWebpackPlugin(
    p => {
      if (p.options.filename !== 'index.html') {
        console.error('Cannot modify HtmlWebpackPlugin. Unexpected filename:', p.options.filename);
        return p;
      } else if (p.options.chunks !== 'all') {
        console.error('Cannot modify HtmlWebpackPlugin. Unexpected chunks:', p.options.chunks);
        return p;
      }
      p.options.chunks = ['main'];
      return p
    },
    'HtmlWebpackPlugin',
    config,
  );
}

// Logs the config, mainly useful for debugging
const logConfig = config => {
    console.log(JSON.stringify(config, null, 2))
    return config
}

// The module.exports determines which scripts actually get run!
module.exports = [
    addWorkerLoader,
    addLaunch,
    addHtmlWebpackPluginForLaunch,
    changeOutputFilenameForDev,
    editChunksInHtmlWebpackPluginForIndex,
    //logConfig
];
