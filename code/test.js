const Max = require('max-api');
/*
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
*/
function seqFromPitches(str) {
	var seq = {};
	seq.quantizationInfo = {stepsPerQuarter: 4}; 
	seq.notes = [];
	var pitches = str.split(" ").map(n => parseInt(n));
	var seqLength = pitches.length > 64 ? 64 : pitches.length;
	var stepLength = Math.floor(64 / seqLength);
	for(var i = 0; i < seqLength; i++) {
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
	// reinject primer sequences b/c magenta messes 
 	// them up sometimes
	seqs[0] = primers[0];
	seqs[4] = primers[1];
	seqs[20] = primers[2];
	seqs[24] = primers[3];
		
	for (var i = 0; i < seqs.length; i++) {
		var pitches = seqs[i].notes.map(step => step.pitch);
		pitches.unshift("pitch", i);
		Max.outlet(pitches);
		outputAsList("state composed");	
		//outputSeq(pitches, i+2);
	}
}

Max.addHandler("compose", (a, b, c, d) => {
	outputAsList("state composing");
	// invert b and c because megante orders meledoies like:
	//		top left > bottm left > top rigth > bottom right
	// but we order them like:
	//		top left > top right > bottom left >bottom right
	//
	// (which makes much more sense, duh)
	var primers = [a, c, b, d].map(p => seqFromPitches(p));
	compose(primers);
});

Max.addHandler("parse", (a, b, c, d) => {
	Max.post(`seq  ${JSON.stringify(parseDict(a))}`);
	Max.post(`seq  ${JSON.stringify(parseDict(b))}`);
	Max.post(`seq  ${JSON.stringify(parseDict(c))}`);
	Max.post(`seq  ${JSON.stringify(parseDict(d))}`);
});

function parseDict(dict) {
	var seq = {};
	seq.quantizationInfo = {stepsPerQuarter: 4}; 
	seq.notes = [];
	for(var i = 0; i < dict.nstep; i++) {
		var pitch = dict.pitch[i];
		if (pitch > 0) {
			var step = {
				pitch: pitch,
				quantizedStartStep: i,
				quantizedEndStep: i + (dict.duration[i] / dict.interval)
			};
			seq.notes.push(step);
		}
	}
	return seq;
}

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

