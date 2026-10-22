# SPDX-FileCopyrightText: 2026 Linkco contributors
# SPDX-License-Identifier: AGPL-3.0-or-later
import importlib.util
from pathlib import Path
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('runner', Path(__file__).parents[1] / 'run-docker.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

class RunnerTests(unittest.TestCase):
    def test_read_config(self):
        self.assertEqual(runner.read_env('# comment\nA="hello world"\nB=abc'), {'A':'hello world','B':'abc'})

    def test_ips_reject_urls(self):
        with self.assertRaises(ValueError):
            runner.local_hosts(['http://192.168.1.1'])

    def config(self, folder, volumes='', recovered=None):
        def fake_docker(*args, **kwargs):
            return SimpleNamespace(stdout=volumes, returncode=0)
        return (patch.object(runner, 'ROOT', Path(folder)),
                patch.object(runner, 'ENV_FILE', Path(folder) / '.env.linkco'),
                patch.object(runner, 'docker', side_effect=fake_docker),
                patch.object(runner, 'recovered_environment', return_value=recovered or {}))

    def test_new_config_and_repeat_preserve_password(self):
        with tempfile.TemporaryDirectory() as folder:
            a,b,c,d = self.config(folder)
            with a,b,c,d:
                first = runner.prepare_config(['192.168.100.100'])
                second = runner.prepare_config([])
                self.assertEqual(first['LINKCO_DB_PASSWORD'], second['LINKCO_DB_PASSWORD'])
                self.assertIn('192.168.100.100', second['LINKCO_TRUSTED_HOSTS'])
                self.assertEqual(second['LINKCO_PORT'], '8090')

    def test_existing_data_without_password_refuses(self):
        with tempfile.TemporaryDirectory() as folder:
            a,b,c,d = self.config(folder, volumes='linkco-local_linkco_database')
            with a,b,c,d, self.assertRaisesRegex(RuntimeError, 'Existing Linkco data'):
                runner.prepare_config([])
            self.assertFalse((Path(folder) / '.env.linkco').exists())

    def test_empty_file_recovers_container_credentials(self):
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder) / '.env.linkco').touch()
            a,b,c,d = self.config(folder, volumes='database', recovered={
                'POSTGRES_PASSWORD':'original-db', 'NEXTCLOUD_ADMIN_PASSWORD':'original-admin'})
            with a,b,c,d:
                values = runner.prepare_config([])
            self.assertEqual(values['LINKCO_DB_PASSWORD'], 'original-db')
            self.assertEqual(values['LINKCO_ADMIN_PASSWORD'], 'original-admin')

if __name__ == '__main__':
    unittest.main()
