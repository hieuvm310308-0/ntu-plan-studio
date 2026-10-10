// Demonstration data only. Module labels are illustrative; indexes, classes and
// venues are fictional and must never be used for STARS registration.
export const dataNotice = 'Demo catalog · Fictional class indexes and schedules. Verify your actual classes in NTU STARS.';

const session = (day, start, end, type, venue) => ({ day, start, end, type, venue });
const option = (id, sessions) => ({ id, index: id, label: id, sessions });
const module = (code, title, color, base, variants) => ({
  code, title, name: title, au: 3, color, sample: true,
  indexes: variants.map((sessions, i) => option(`DEMO-${base + i}`, sessions)),
});

export const catalog = [
  module('SC1003', 'Introduction to Computational Thinking', '#6c5ce7', 10001, [
    [session(0,600,720,'LEC','LT2A'),session(2,600,660,'TUT','LHN-TR+1')],
    [session(0,720,840,'LEC','LT2A'),session(2,960,1020,'TUT','LHN-TR+2')],
    [session(4,540,660,'LEC','LT2A'),session(1,780,840,'TUT','LHN-TR+3')],
  ]),
  module('SC1004', 'Linear Algebra for Computing', '#e69539', 10011, [
    [session(0,840,960,'LEC','LT1A'),session(3,660,720,'TUT','LHN-TR+4')],
    [session(0,840,960,'LEC','LT1A'),session(3,780,840,'TUT','LHN-TR+5')],
    [session(4,780,900,'LEC','LT1A'),session(2,600,660,'TUT','LHN-TR+6')],
  ]),
  module('SC1005', 'Digital Logic', '#299c87', 10021, [
    [session(1,600,720,'LEC','LT2'),session(3,840,960,'LAB','S2-B4C-17')],
    [session(1,720,840,'LEC','LT2'),session(3,900,1020,'LAB','S2-B4C-17')],
    [session(2,840,960,'LEC','LT2'),session(4,600,720,'LAB','S2-B4C-17')],
  ]),
  module('SC2001', 'Algorithm Design and Analysis', '#d97194', 20011, [
    [session(2,780,900,'LEC','LT19'),session(1,840,900,'TUT','LHN-TR+7')],
    [session(2,780,900,'LEC','LT19'),session(1,900,960,'TUT','LHN-TR+8')],
    [session(0,600,720,'LEC','LT19'),session(4,900,960,'TUT','LHN-TR+9')],
  ]),
  module('SC1006', 'Computer Organisation and Architecture', '#4789c9', 10031, [
    [session(0,960,1080,'LEC','LT2A'),session(2,660,780,'LAB','HWLAB1')],
    [session(1,900,1020,'LEC','LT2A'),session(4,780,900,'LAB','HWLAB1')],
    [session(3,720,840,'LEC','LT2A'),session(0,960,1080,'LAB','HWLAB1')],
  ]),
  module('SC1007', 'Data Structures and Algorithms', '#9566be', 10041, [
    [session(1,780,900,'LEC','LT19'),session(4,600,660,'TUT','LHN-TR+10')],
    [session(3,960,1080,'LEC','LT19'),session(0,780,840,'TUT','LHN-TR+11')],
    [session(2,720,840,'LEC','LT19'),session(4,840,900,'TUT','LHN-TR+12')],
  ]),
  module('SC2002', 'Object Oriented Design and Programming', '#cb764f', 20021, [
    [session(2,600,720,'LEC','LT2'),session(3,780,900,'LAB','SWLAB2')],
    [session(0,960,1080,'LEC','LT2'),session(2,900,1020,'LAB','SWLAB2')],
    [session(4,660,780,'LEC','LT2'),session(1,960,1080,'LAB','SWLAB2')],
  ]),
  module('SC2005', 'Operating Systems', '#5b9b62', 20051, [
    [session(0,780,900,'LEC','LT1'),session(1,660,780,'LAB','SWLAB1')],
    [session(2,960,1080,'LEC','LT1'),session(3,720,840,'LAB','SWLAB1')],
    [session(4,900,1020,'LEC','LT1'),session(0,600,720,'LAB','SWLAB1')],
  ]),
  module('SC2006', 'Software Engineering', '#a58b3f', 20061, [
    [session(3,600,720,'LEC','LT19'),session(4,780,900,'PRJ','LHN-TR+13')],
    [session(1,960,1080,'LEC','LT19'),session(2,720,840,'PRJ','LHN-TR+14')],
    [session(0,720,840,'LEC','LT19'),session(3,960,1080,'PRJ','LHN-TR+15')],
  ]),
  module('SC2008', 'Computer Networks', '#438f9f', 20081, [
    [session(4,600,720,'LEC','LT2A'),session(1,780,900,'LAB','SWLAB3')],
    [session(3,780,900,'LEC','LT2A'),session(0,960,1080,'LAB','SWLAB3')],
    [session(2,900,1020,'LEC','LT2A'),session(4,840,960,'LAB','SWLAB3')],
  ]),
];

export const demoSelections = catalog.slice(0, 4).map(item => ({
  code: item.code, index: item.indexes[0].id, indexId: item.indexes[0].id, locked: false,
}));

export default catalog;
