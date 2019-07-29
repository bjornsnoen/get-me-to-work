try {
    let pulseOptions = JSON.parse(decodeURIComponent(document.querySelector('meta[name="FINN.pulseOptions"]').content));
    let possibleAddress = document.querySelector('.panel > .u-caption');
    let foundAddress = '';

    if (possibleAddress){
        foundAddress = possibleAddress.innerHTML;
    }
    chrome.runtime.sendMessage({
        action: 'finnParsed',
        pulseOptions: pulseOptions,
        foundAddress: foundAddress
    });
} catch (e) {}