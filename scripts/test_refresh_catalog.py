import unittest
from refresh_catalog import parse_schedule, parse_weeks, parse_time

class ScheduleTests(unittest.TestCase):
    def test_weeks(self):
        self.assertEqual(parse_weeks('Teaching Wk2-6,8-12'),[2,3,4,5,6,8,9,10,11,12])
        self.assertEqual(parse_weeks('Teaching Wk1,3,5,7,9,11,13'),[1,3,5,7,9,11,13])
        self.assertIsNone(parse_weeks(''))
        with self.assertRaises(ValueError): parse_weeks('Teaching Wk14')

    def test_continuation_rows_and_weekends(self):
        source='''<table><tr><td>SC9999</td><td>TEST COURSE</td><td>3.0 AU</td></tr></table>
        <table border><tr><th>INDEX</th></tr>
        <tr><td>12345</td><td>LEC</td><td>L1</td><td>MON</td><td>0930-1020</td><td>LT1</td><td></td></tr>
        <tr><td></td><td>LAB</td><td>A1</td><td>SAT</td><td>1030-1220</td><td>LAB1</td><td>Teaching Wk2,4,6</td></tr>
        <tr><td>12346</td><td>LAB</td><td>B1</td><td></td><td></td><td></td><td></td></tr></table>'''
        modules,excluded=parse_schedule(source,'CSC;;1;F')
        self.assertEqual(len(modules[0]['indexes']),1)
        sessions=modules[0]['indexes'][0]['sessions']
        self.assertEqual(len(sessions),2)
        self.assertEqual(sessions[0]['end'],620) # Keep official 10-minute end offsets.
        self.assertEqual(sessions[1]['day'],5)
        self.assertEqual(sessions[1]['weeks'],[2,4,6])
        self.assertEqual(excluded[0]['index'],'12346') # Exclude entire incomplete index.

    def test_bad_times(self):
        with self.assertRaises(ValueError): parse_time('0960-1020')
        with self.assertRaises(ValueError): parse_time('1030-0930')

if __name__=='__main__': unittest.main()
