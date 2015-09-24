# vesperjs
A library for adding mention autocomplete/insertion, ie @user #tag :emoji

# Getting started

```javascript
<div id="myEditableContent" contentEditable></div>

<script type="text/javascript">
te.newMentionListener('myEditableContent', {
	data: ['homer', 'marge', 'maggie', 'lisa', 'bort'],
});
</script>
```

# Notable features
- No dependencies. Zero.
- Only 2 KB (compressed)
- IE9+ compatibility
- Works with contentEditable and textareas
- Plugable - easiliy add additional support and custom views
- Trigger character is configurable, not just '@'