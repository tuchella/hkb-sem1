const Max = require('max-api');

// fix b/c there's no window
global.performance = require('perf_hooks').performance;
global.fetch = require('node-fetch');

global.window = {};
global.window.hasOwnProperty = window.hasOwnProperty || function(s) { return false; };

require('tone');

global.window = undefined;

const mm = require('@magenta/music');
var numInterpolations = 3;

outputAsList("state initializing");

const model = new mm.MusicVAE(
	'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2');
model.initialize().then(function(m) { 
	Max.post(`Model initialized`);
	outputAsList("state initialized");
});

function seqFromPitches(str) {
	var seq = {};
	seq.quantizationInfo = {stepsPerQuarter: 4}; 
	seq.notes = [];
	var pitches = str.split(" ").map(n => parseInt(n));
	var stepLength = Math.floor(64 / pitches.length);
	for(var i = 0; i < pitches.length; i++) {
		var step = {
			pitch: pitches[i],
			quantizedStartStep: i * stepLength,
			quantizedEndStep: (i * stepLength) + stepLength    
		};
		seq.notes.push(step);
	}
	Max.post(`Converted seq to ${JSON.stringify(seq)}`);
	return seq;
}


async function compose(primers) {
	var seqs = await model.interpolate(primers, 5);
	Max.post(`result ${JSON.stringify(seqs)}`);
	for (var i = 0; i < seqs.length; i++) {
		Max.post(`Composed ${JSON.stringify(seqs[i])}`)
		var pitches = seqs[i].notes.map(step => step.pitch);
		pitches.unshift("pitch", i);
		Max.outlet(pitches);
		outputAsList("state composed");	
		//outputSeq(pitches, i+2);
	}
}

Max.addHandler("compose", (a, b, c, d) => {
	outputAsList("state composing");
	//outputSeq(left.pitch, 1);
	var primers = [a, b, c, d].map(p => seqFromPitches(p));
	compose(primers);
	//outputSeq(right.pitch, 12);
});

function outputAsList(s) {
	Max.outlet(s.split(" "));
}

/*
function outputSeq(pitches, n) {
	var length = pitches.length;
	pitches = pitches.slice(0); // clone array
	
	Max.outlet(["target_seq", n]);
	Max.outlet(["nstep", length]); 
	Max.outlet(["loop", 1, length]); 
}*/

