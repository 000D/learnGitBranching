var _ = require('underscore');
var intl = require('../intl');

var GitCommands = require('../git/commands');
var Errors = require('../util/errors');

var CommandProcessError = Errors.CommandProcessError;
var GitError = Errors.GitError;
var Warning = Errors.Warning;
var CommandResult = Errors.CommandResult;

var commandConfig = {
  commit: {
    regex: /^hg +(commit|ci)($|\s)/,
    options: [
      '--amend',
      '-A',
      '-m'
    ],
    delegate: function(engine, command) {
      var options = command.getSupportedMap();
      if (options['-A']) {
        command.addWarning(intl.str('hg-a-option'));
      }

      return {
        vcs: 'git',
        name: 'commit'
      };
    }
  },

  status: {
    regex: /^hg +(status|st) *$/,
    dontCountForGolf: true,
    execute: function(engine, command) {
      throw new GitError({
        msg: intl.str('hg-error-no-status')
      });
    }
  },

  'export': {
    regex: /^hg +export($|\s)/,
    dontCountForGolf: true,
    delegate: function(engine, command) {
      command.mapDotToHead();
      return {
        vcs: 'git',
        name: 'show'
      };
    }
  },

  graft: {
    regex: /^hg +graft($|\s)/,
    options: [
      '-r'
    ],
    delegate: function(engine, command) {
      var options = command.getSupportedMap();
      if (!options['-r']) {
        throw new GitError({
          msg: intl.str('git-error-options')
        });
      }
      command.setGeneralArgs(options['-r']);
      return {
        vcs: 'git',
        name: 'cherrypick'
      };
    }
  },

  log: {
    regex: /^hg +log($|\s)/,
    options: [
      '-f'
    ],
    dontCountForGolf: true,
    delegate: function(engine, command) {
      var options = command.getSupportedMap();
      command.acceptNoGeneralArgs();

      if (!options['-f']) {
        throw new GitError({
          msg: intl.str('hg-error-log-no-follow')
        });
      }
      command.mapDotToHead();
      return {
        vcs: 'git',
        name: 'log'
      };
    }
  },

  bookmark: {
    regex: /^hg (bookmarks|bookmark|book)($|\s)/,
    options: [
      '-r',
      '-f',
      '-d'
    ],
    delegate: function(engine, command) {
      var options = command.getSupportedMap();
      var generalArgs = command.getGeneralArgs();
      var branchName;
      var rev;

      var delegate = { vcs: 'git' };

      if (options['-m'] && options['-d']) {
        throw new GitError({
          msg: '-m and -d are incompatible'
        });
      }
      if (options['-d'] && options['-r']) {
        throw new GitError({
          msg: '-r is incompatible with -d'
        });
      }
      if (options['-m'] && options['-r']) {
        throw new GitError({
          msg: '-r is incompatible with -m'
        });
      }
      if (generalArgs.length + (options['-r'] ? options['-r'].length : 0) +
          (options['-d'] ? options['-d'].length : 0) === 0) {
        delegate.name = 'branch';
        return delegate;
      }

      if (options['-d']) {
        options['-D'] = options['-d'];
        delete options['-d'];
        delegate.name = 'branch';
      } else {
        if (options['-r']) {
          // we specified a revision with -r but
          // need to flip the order
          branchName = options['-r'][1] || '';
          rev = options['-r'][0] || '';
          delegate.name = 'branch';
          command.setGeneralArgs([branchName, rev]);
        } else if (generalArgs.length > 0) {
          command.setSupportedMap({'-b': [generalArgs[0]]});
          delegate.name = 'checkout';
          command.setGeneralArgs([]);
        } else {
          delegate.name = 'branch';
        }
      }

      return delegate;
    }
  },

  rebase: {
    regex: /^hg +rebase($|\s+)/,
    options: [
      '-d',
      '-s',
      '-b'
    ],
    execute: function(engine, command) {
      var throwE = function() {
        throw new GitError({
          msg: intl.str('git-error-options')
        });
      };

      var options = command.getSupportedMap();
      // if we have both OR if we have neither
      if ((options['-d'] && options['-s']) ||
          (!options['-d'] && !options['-s'])) {
      }

      if (!options['-b']) {
        options['-b'] = ['.'];
      }

      command.setSupportedMap(options);
      command.mapDotToHead();
      options = command.getSupportedMap();

      if (options['-d']) {
        var dest = options['-d'][0] || throwE();
        var base = options['-b'][0];

        engine.hgRebase(dest, base);
      } else {
        // TODO
      }
    }
  },

  update: {
    regex: /^hg +(update|up)($|\s+)/,
    delegate: function(engine, command) {
      return {
        vcs: 'git',
        name: 'checkout'
      };
    }
  },
  
  backout: {
    regex: /^hg +backout($|\s+)/,
    delegate: function(engine, command) {
      return {
        vcs: 'git',
        name: 'revert'
      };
    }
  },

  histedit: {
    regex: /^hg +histedit($|\s+)/,
    delegate: function(engine, command) {
      var args = command.getGeneralArgs();
      command.validateArgBounds(args, 1, 1);
      command.setSupportedMap({
        '-i': args
      });
      command.setGeneralArgs([]);
      return {
        vcs: 'git',
        name: 'rebase'
      };
    }
  },

  // TODO rebase :OOOO need to graft? engine work
  // rebase: {

  pull: {
    regex: /^hg +pull($|\s+)/,
    delegate: function(engine, command) {
      return {
        vcs: 'git',
        name: 'pull'
      };
    }
  },

  summary: {
    regex: /^hg +(summary|sum) *$/,
    delegate: function(engine, command) {
      return {
        vcs: 'git',
        name: 'branch'
      };
    }
  }
};

exports.commandConfig = commandConfig;
