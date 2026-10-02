-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA512

Format: 3.0 (quilt)
Source: redis
Binary: redis, redis-sentinel, redis-server, redis-tools
Architecture: any all
Version: 5:8.0.2-3+deb13u2
Maintainer: Chris Lamb <lamby@debian.org>
Homepage: https://redis.io/
Standards-Version: 4.7.2
Vcs-Browser: https://salsa.debian.org/lamby/pkg-redis
Vcs-Git: https://salsa.debian.org/lamby/pkg-redis.git -b debian/experimental
Testsuite: autopkgtest
Build-Depends: debhelper-compat (= 13), libhiredis-dev, libjemalloc-dev [linux-any], liblua5.1-dev, liblzf-dev, libssl-dev, libsystemd-dev, lua-bitop-dev, lua-cjson-dev, openssl <!nocheck>, pkgconf, procps <!nocheck>, tcl <!nocheck>, tcl-tls <!nocheck>
Package-List:
 redis deb database optional arch=all
 redis-sentinel deb database optional arch=any
 redis-server deb database optional arch=any
 redis-tools deb database optional arch=any
Checksums-Sha1:
 2a80573fb0296f31f4413e8c591361006cb31d4d 3860147 redis_8.0.2.orig.tar.gz
 3237f63978e2df95a119117df087e0d55a52ae02 44020 redis_8.0.2-3+deb13u2.debian.tar.xz
Checksums-Sha256:
 caf3c0069f06fc84c5153bd2a348b204c578de80490c73857bee01d9b5d7401f 3860147 redis_8.0.2.orig.tar.gz
 3384f3beb64638c62b48219c856a7a7424325a08800fd9ba070fb8bf205bfc09 44020 redis_8.0.2-3+deb13u2.debian.tar.xz
Files:
 fb9874e35f105ce3b0ac998ce8f5f0db 3860147 redis_8.0.2.orig.tar.gz
 6bce5fd239e1a1740cee92a97cad36c6 44020 redis_8.0.2-3+deb13u2.debian.tar.xz

-----BEGIN PGP SIGNATURE-----

iQEzBAEBCgAdFiEExq6D0hxncEPaPayX+GQ1dHE8m64FAmoEvHcACgkQ+GQ1dHE8
m67/FwgAwu+W3bwqHHO4Y8LfQpcXjxDzFg1LTfc/mBzkn4E6DAhYSWAgpatkzxAs
aT2r4L6de17eiVEhkllNWdPgMLe9VjK0cx+ZcPu7OfKcraCWwg1INi+uYfBUJTns
1OYjdGb+mPwscvpYQt8j5jV1CAfZYEfUwh6G0uAHLVw2/OdxuLXG47xnng74QDGy
cgfLYoPza9auhZNrLXU++ogCBkhGvndBt6FTTTq/520+nM2zI857UboyN/nxi+zl
YoaKrZgTc6100llf3YYvuYIx2p/bJfwfICC42V8pzjCrPvObHDMy14/Ih53R034x
Be6JD6jLucbPgluRz36eDYTSnWjOlA==
=F7hC
-----END PGP SIGNATURE-----
