

type stop = () => void

export function RefreshVolume(stream: MediaStream, refresh: (instant: number, slow: number, clip: number) => void, refreshRate?: number): stop {
    let instant = 0.0
    let slow = 0.0
    let clip = 0.0
    let mic: MediaStreamAudioSourceNode
    let context = new AudioContext()
    let script = context.createScriptProcessor(2048, 1, 1)
    let oldTime = Date.now()
    if (!refreshRate) { refreshRate = 100 }
    script.onaudioprocess = function (event: AudioProcessingEvent) {
        const input = event.inputBuffer.getChannelData(0);
        let i;
        let sum = 0.0;
        let clipcount = 0;
        for (i = 0; i < input.length; ++i) {
            sum += input[i] * input[i];
            if (Math.abs(input[i]) > 0.99) clipcount += 1
        }
        instant = Math.sqrt(sum / input.length);
        slow = 0.95 * slow + 0.05 * instant;
        clip = clipcount / input.length;
        if (Date.now() - oldTime >= refreshRate) {
            refresh(instant, slow, clip)
            oldTime = Date.now()
        }
    }

    try {
        mic = context.createMediaStreamSource(stream);
        mic.connect(script)
        script.connect(context.destination);
    } catch (err) {
        mic.disconnect();
        script.disconnect();
    }

    return () => {
        mic.disconnect();
        script.disconnect();
    }
}



