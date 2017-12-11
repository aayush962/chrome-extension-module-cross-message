# cem-cross-message

Chrome Extension Cross-Message :

 * Background
 * Sideground (content-script)
 * Foreground (inject-script)

## Module Class

### constructor(url_pattern: String, options: Object)
```javascript
class ExampleModule extends chrome.runtime.Module {
  constructor() {
    // options = { foreground: Boolean }
    super("https://www.google.*/*", {
      foreground: false
    });
  }
  /* ... */
}
```

### cast(action: String, data: Object)

### emit(action: String, ...args: Object[])

### on(action: String, callback: Function)

### onCreate(href: String)
```javascript
class ExampleModule extends chrome.runtime.Module {
  /* ... */
  onCreate(href) {
    if(chrome.runtime.background) console.info("Background Start !");
    if(chrome.runtime.sideground) console.info("Sideground Start !");
    if(chrome.runtime.foreground) console.info("Foreground Start !");
  }
  /* ... */
}
```

### onMessage(action: String, data: Object, from: String)
```javascript
class ExampleModule extends chrome.runtime.Module {
  /* ... */
  onMessage(action, data, from) {
    // from = "remote", "background", "sideground", "foreground"
    console.info(from, action, data);
  }
  /* ... */
}
```

### onForeground(href: String)
```javascript
class ExampleModule extends chrome.runtime.Module {
  /* ... */
  onForeground(href) {
    // Only Foreground Workflow
  }
  /* ... */
}
```

### onSideground(href: String)
```javascript
class ExampleModule extends chrome.runtime.Module {
  /* ... */
  onSideground(href) {
    // Only Sideground Workflow
  }
  /* ... */
}
```

### onBackground(href: String)
```javascript
class ExampleModule extends chrome.runtime.Module {
  /* ... */
  onBackground(href) {
    // Only Background Workflow
  }
  /* ... */
}
```


## Example

```javascript
import 'chrome-extension-module-cross-message';

chrome.runtime.attach(class ExampleModule extends chrome.runtime.Module {
  constructor() {
    super('https://*.google.*/*');
  }
  
  onSideground(href) {
    // Sideground <> Background CM
    this.cast("background.actionA", 1);
    this.on("sideground.actionA", (value) => {
      // value = 2;
    });
  }
  
  onBackground(href) {
    // Background <> Sideground CM
    this.on("background.actionA", (value) => {
      // value = 1;
      this.cast("sideground.actionA", value + 1);
    });
  }
})
```