# OpenFin Browser View Tab Renaming Guide

This document outlines the various methods for renaming browser view tabs in OpenFin applications.

## Overview

OpenFin provides several approaches to control the display name of view tabs in browser windows. The tab name can be set through ViewOptions, document title manipulation, or programmatic changes after the view is created.

## Method 1: ViewOptions Title Property (Recommended)

The most reliable method is to set the `title` property in ViewOptions when creating the view, combined with the `titleOrder` property to control precedence.

```javascript
const viewOptions = {
  name: 'myView',
  url: 'https://example.com',
  title: 'My Custom Tab Name',
  titleOrder: 'options' // Prioritizes viewOptions.title over document.title
};

const platform = fin.Platform.getCurrentSync();
await platform.createView(viewOptions, windowIdentity);
```

### Title Order Options

The `titleOrder` property controls the precedence of title sources:

- **`'options'`**: viewOptions.title (componentState), document.title, viewOptions.url
- **`'document'`**: document.title, viewOptions.title(componentState), viewOptions.url (default behavior)

## Method 2: Document Title Manipulation

### Static HTML Title
Set the title in the HTML head section:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Tab Name</title>
</head>
<body>
    <!-- Content here -->
</body>
</html>
```

### Dynamic JavaScript Title
Change the title programmatically within the view's content:

```javascript
// Inside the view's content
document.title = "New Tab Name";
```

**Note**: If the content dynamically changes the document title again, your changes will be lost.

## Method 3: executeJavaScript Method

Listen for the `tab-created` event and use the view's `executeJavaScript()` method to set the title:

```javascript
const CONTAINER_ID = 'layout-container';

window.addEventListener('DOMContentLoaded', () => {
  const myLayoutContainer = document.getElementById(CONTAINER_ID);
  
  myLayoutContainer.addEventListener('tab-created', (event) => {
    let view = fin.View.wrapSync({ 
      uuid: event.detail.uuid, 
      name: event.detail.name 
    });
    
    view.executeJavaScript(`document.title = "Name I Want"`);
  });
  
  fin.Platform.Layout.init({ CONTAINER_ID });
});
```

## Method 4: Preload Scripts

Use a preload script at the view level to change the title after the DOM is loaded:

```javascript
// In preload script
window.addEventListener('DOMContentLoaded', (event) => {
  document.title = "Name I Want";
});
```

### ViewOptions with Preload Script

```javascript
const viewOptions = {
  name: 'myView',
  url: 'https://example.com',
  preloadScripts: [{
    url: 'path/to/preload-script.js'
  }]
};
```

## Complete Example

Here's a comprehensive example that demonstrates creating a view with a custom tab name:

```javascript
// Get window identity
let windowIdentity;
if (fin.me.isWindow) {
  windowIdentity = fin.me.identity;
} else if (fin.me.isView) {
  windowIdentity = (await fin.me.getCurrentWindow()).identity;
} else {
  throw new Error('Not running in a platform View or Window');
}

// Create view with custom title
const viewOptions = {
  name: 'custom_view',
  url: 'https://example.com',
  title: 'My Custom Application',
  titleOrder: 'options'
};

const platform = fin.Platform.getCurrentSync();
await platform.createView(viewOptions, windowIdentity);
```

## Important Considerations

1. **Title Persistence**: Changes made through `document.title` can be overwritten if the content dynamically updates the title again.

2. **Precedence**: The `titleOrder` property determines which title source takes priority.

3. **Timing**: When using event listeners or preload scripts, ensure the DOM is fully loaded before attempting to modify the title.

4. **Best Practice**: Use `ViewOptions.title` with `titleOrder: 'options'` for the most reliable control over tab names.

## Troubleshooting

- **Title not changing**: Verify that `titleOrder` is set to `'options'` if using ViewOptions.title
- **Title reverts**: The content may be dynamically updating `document.title` - consider using ViewOptions instead
- **Event not firing**: Ensure proper setup of event listeners and that the container ID matches your layout configuration

## References

- [OpenFin ViewOptions Documentation](https://developer.openfin.co/docs/javascript/stable/interfaces/OpenFin.ViewOptions.html)
- [OpenFin Platform API](https://developer.openfin.co/docs/javascript/stable/classes/OpenFin.Platform.html)
- [View Tab Naming - OpenFin Support](https://openfin.zendesk.com/hc/en-us/articles/4469760806804-View-Tab-Naming)