import React, { Component } from 'react';
import { VictoryBar, VictoryContainer } from 'victory';
import './App.css';

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            playing: false,
            loading: false,
            audioCtx: null,
            audioAnalyzer: null,
            sourceNode: null,
            audioData: null,
            duration: null,
            playback: null,
            data: []
        }
    }

    componentWillMount() {
        this.setAudioContext()
        .then(() => {
            this.setAudioAnalyzer();
        }).then(() => {
            this.setAudioData();
        }).catch((error) => {
            console.log('error', error);
        });
    }

    componentDidMount() {
        setTimeout(() => {
            this.setSourceNode().then(() => this.loadAudio());
        }, 3000);
    }

    componentWillUnmount() {
        const { audioCtx } = this.state;

        audioCtx.close();
    }

    setAudioContext() {
        return new Promise((resolve, reject) => {
            try {
                window.AudioContext = window.AudioContext || window.webkitAudioContext;
                this.setState({ audioCtx: new window.AudioContext() }, () => {
                    return resolve();
                });
            } catch(e) {
                reject("Not supported");
            }
        });
    }

    setSourceNode() {
        const { audioCtx, audioAnalyzer } = this.state;

        return new Promise((resolve, reject) => {
            const sourceNode = audioCtx.createBufferSource();

            sourceNode.connect(audioAnalyzer);
            sourceNode.connect(audioCtx.destination);
            sourceNode.onEnded = () => console.log('audo ended');

            this.setState({ sourceNode }, () => {
                return resolve();
            });
        });
    }

    setAudioAnalyzer() {
        const { audioCtx } = this.state;

        return new Promise((resolve, reject) => {
            const audioAnalyzer = audioCtx.createAnalyser();

            audioAnalyzer.smoothingTime = 0.6;
            audioAnalyzer.fftSize = 512;

            this.setState({ audioAnalyzer }, () => {
                return resolve();
            });
        });
    }

    setAudioData() {
        const { audioAnalyzer } = this.state;

        return new Promise((resolve, reject) => {
            const audioData = new Uint8Array(audioAnalyzer.frequencyBinCount);

            this.setState({ audioData }, () => {
                resolve();
            });
        });
    }

    loadAudio() {
        const { audioCtx } = this.state;
        this.setState({ loading: true });

        this.requestAudio().then((response) => {
            audioCtx.decodeAudioData(response, (buffer) => {
                this.onPlaying(buffer);
            }, (error) => {
                console.log(error);
            });
        });

        return this;
    }

    onPlaying(buffer) {
        const { sourceNode } = this.state;

        this.setState({ loading: false, playing: true }, () => {
            sourceNode.buffer = buffer;
            sourceNode.start(0);

            this.setState({
                duration: (new Date(0, 0)).getTime(),
                playback: '00:00'
            });

            setInterval(() => {
                if (this.state.playing) {
                    const now = new Date(this.state.duration);
                    const min = now.getHours();
                    const sec = now.getMinutes() + 1;

                    this.setState({
                        playback: (min < 10 ? `0${min}` : min) + ':' + (sec < 10 ? `0${sec}` : sec),
                        duration: now.setMinutes(sec)
                    });
                }
            }, 1000);
            
            this.renderBars();
        });
    }

    renderBars() {
        const { audioAnalyzer } = this.state;

        setInterval(() => {
            const barData = [];
            const data = new Uint8Array(audioAnalyzer.frequencyBinCount);
            audioAnalyzer.getByteFrequencyData(data);

            const bars = 50;
            const jmp = Math.floor(data.length / bars);

            for (let i = 0; i < bars; i++) {
                const amp = data[i * jmp];
                barData.push({ x: i, y: amp });
            }
            this.setState({ data: barData });
        }, 100);
    }

    requestAudio() {
        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();

            req.open('GET', 'http://localhost:3000/ok.mp3');
            req.responseType = 'arraybuffer';

            req.onload = () => {
                return resolve(req.response);
            };

            req.send();
        });
    }

    render() {
        return (
            <div>
                <div>{ this.state.playing ? this.state.playback : 'Loading...' }</div>
                <VictoryContainer responsive={ false } width={ 600 } height={ 400 }>
                    <VictoryBar
                        style={{ data: { fill: "red" } }}
                        size={7}
                        data={ this.state.data }
                    />
                </VictoryContainer>
            </div>
        )
    }
}

export default App;
