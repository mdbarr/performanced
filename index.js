#!/usr/bin/env node
'use strict';

const fs = require('fs');
const glob = require('glob');
const async = require('async');

const procPattern = '{/proc/+([0-9])/+(cmdline|status),/proc/+([0-9])/net/snmp}';
const numberRegExp = /^\d+$/;
const pidRegExp = /proc\/(\d+)\//;
const separatorRegExp = /\u0000/g;

function lcFirst(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

function parseValue(value) {
  if (numberRegExp.test(value)) {
    return Number(value);
  } else {
    return value;
  }
}

glob(procPattern, function(err, matches) {
  if (err) {
    console.log('Error', err);
  } else {
    const moment = {
      timestamp: Date.now(),
      processes: {}
    };

    async.each(matches, function(path, next) {
      const [ , pid ] = path.match(pidRegExp);
      if (pid) {
        moment.processes[pid] = moment.processes[pid] || {};
        const item = moment.processes[pid];
        fs.readFile(path, function(readError, data) {
          if (readError || !data) {
            return next();
          } else {
            data = data.toString();
            if (path.includes('cmdline')) {
              item.cmdline = data.replace(separatorRegExp, ' ').trim();
            } else {
              const lines = data.trim().split(/\n/);
              for (const line of lines) {
                let [ key, value ] = line.split(/:\s+/);
                if (key && value) {
                  key = lcFirst(key.trim());
                  value = value.trim();
                  if (item[key]) {
                    const keys = item[key].split(/\s+/);
                    const values = value.split(/\s+/);
                    const obj = {};
                    for (let i = 0; i < keys.length; i++) {
                      obj[lcFirst(keys[i])] = parseValue(values[i] || null);
                    }
                    item[key] = obj;
                  } else {
                    item[key] = parseValue(value);
                  }
                }
              }
            }
            return next();
          }
        });
      }
    }, function() {
      console.log(JSON.stringify(moment, null, 2));
    });
  }
});
