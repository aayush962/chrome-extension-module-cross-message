import _ from 'lodash';
import EventEmitter from 'events';

class Wildcard extends RegExp {
  constructor(pattern) {
    super("^" + pattern.replace(/[.?+^$[\]\\(){}|-]/g, "\\$&").split("*").join(".*") + "$");
  }
}

Object.defineProperty(chrome.runtime, 'foreground', {
  get() { return _.has(chrome, 'webstore'); }
});
Object.defineProperty(chrome.runtime, 'background', {
  get() { return !chrome.runtime.foreground && _.has(chrome, 'permissions'); }
});
Object.defineProperty(chrome.runtime, 'sideground', {
  get() { return !chrome.runtime.background && _.has(chrome, 'extension'); }
});

chrome.runtime.attach = (moduleClass, ...args) => (moduleClass.prototype instanceof chrome.runtime.Module) && new moduleClass(...args);
chrome.runtime.Module = class Module extends EventEmitter {
  constructor(pattern = '*', options = {}) {
    super();
    this.pattern = new Wildcard(pattern);
    this.options = _.merge({ foreground: false }, options);
    this.bindListenerCreate();
    this.bindListenerMessage();
  }

  debug(action, ...args) {
    let type;
    if(chrome.runtime.foreground) { type = 'foreground'; }
    if(chrome.runtime.sideground) { type = 'sideground'; }
    if(chrome.runtime.background) { type = 'background'; }
    console.info(`[${type}] ${this.constructor.name}::${action}`, ...args);
  }

  bindListenerCreate() {
    this.on('onCreate', (href) => {
      const from = href || location.href;
      if(!this.pattern.test(from)) return;
      this.onCreate(from);
      if(chrome.runtime.foreground) this.onForeground(from);
      if(chrome.runtime.sideground) this.onSideground(from);
      if(chrome.runtime.background) this.onBackground(from);
    });
    if(chrome.runtime.sideground && this.options.foreground) {
      const script = document.createElement('script');
      script.src = chrome.extension.getURL('./bundle.js');
      (document.body || document.documentElement).appendChild(script);
    }
    if(chrome.runtime.background) {
      chrome.tabs.onUpdated.addListener((id, info, tab) => {
        if(!this.pattern.test(tab.url) || !_.eq(info.status, 'complete')) return;
        this.emit('onCreate', tab.url);
        this.cast('onCreate', tab.url, id);  
      })
    }
  }

  bindListenerMessage() {
    this.on('onMessage', (detail) => {
      const { action, data, from } = detail;
      this.emit(action, data, from);
      this.onMessage(action, data, from)
    });
    if(chrome.runtime.foreground) {
      document.addEventListener('foreground.onMessage', (e) => {
        const { action, data, from, name } = e.detail;
        if(!this.pattern.test(location.href)) return;
        if(this.constructor.name !== name) return;
        this.emit('onMessage', e.detail, from);
      }, false);
    }
    if(chrome.runtime.sideground) {
      document.addEventListener('sideground.onMessage', (e) => {
        const { action, data, from, name } = e.detail;
        if(!this.pattern.test(location.href)) return;
        if(this.constructor.name !== name) return;
        this.emit('onMessage', e.detail, from);
        this.cast(action, data, from);
      }, false);
      chrome.extension.onMessage.addListener((message, sender) => {
        const { action, data, from, name } = message;
        if(!this.pattern.test(location.href)) return;
        if(this.constructor.name !== name) return;
        this.emit('onMessage', message, from);
        this.cast(action, data, from);  
      });
    }
    if(chrome.runtime.background) {
      chrome.extension.onMessage.addListener((message, sender) => {
        const { action, data, from, name } = message;
        if(!this.pattern.test(location.href)) return;
        if(this.constructor.name !== name) return;
        this.emit('onMessage', message, from);
      });
    }
  }

  cast(action, data, sender) {
    const detail = { action, data, name: this.constructor.name };
    switch(true) {
      case chrome.runtime.foreground:
        _.set(detail, 'from', 'foreground');
        document.dispatchEvent(new CustomEvent('sideground.onMessage', { detail }));
      break;
      case chrome.runtime.sideground:
        _.set(detail, 'from', sender || 'sideground');
        if(_.eq(detail.from, 'sideground') || _.eq(detail.from, 'foreground')) chrome.extension.sendMessage(detail);
        if(_.eq(detail.from, 'sideground') || _.eq(detail.from, 'background')) document.dispatchEvent(new CustomEvent('foreground.onMessage', { detail }));
      break;
      case chrome.runtime.background:
        _.set(detail, 'from', 'background');
        chrome.tabs.sendMessage(_.get(sender, 'tab.id', sender), detail);
      break;
    }
  }

  onCreate(href){
    this.debug('onCreate');
  }
  onMessage(action, data, from){
    this.debug('onMessage', action, data, from);
  }
  onForeground(href) {
    this.debug('onForeground', href);
  }
  onSideground(href) {
    this.debug('onSideground', href);
  }
  onBackground(href) {
    this.debug('onBackground', href);
  }
}