# vesperjs
A library for adding mention autocompletion/insertion, ie @user #tag :emoji

# Getting started

```javascript
<div id="myEditableContent" contentEditable></div>

<script type="text/javascript">
te.mentions.newListener('myEditableContent', {
	data: ['homer', 'marge', 'maggie', 'lisa', 'bort'],
});
</script>
```

# Notable features
- No dependencies. Zero.
- Only 2.5 KB (compressed)
- IE9+ compatibility
- Works with contentEditable and textareas
- Plugable - easily add additional support and custom views
- Trigger character is configurable, not just '@'