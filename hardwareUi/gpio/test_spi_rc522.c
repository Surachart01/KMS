#include <stdio.h>
#include <stdint.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <linux/spi/spidev.h>

static int spi_fd = -1;

static int spi_init(const char *dev, uint32_t speed_hz) {
    uint8_t mode = 0;
    uint8_t bits = 8;

    spi_fd = open(dev, O_RDWR);
    if (spi_fd < 0) {
        perror("open spidev");
        return -1;
    }

    if (ioctl(spi_fd, SPI_IOC_WR_MODE, &mode) == -1) {
        perror("SPI_IOC_WR_MODE");
        return -1;
    }
    if (ioctl(spi_fd, SPI_IOC_WR_BITS_PER_WORD, &bits) == -1) {
        perror("SPI_IOC_WR_BITS_PER_WORD");
        return -1;
    }
    if (ioctl(spi_fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed_hz) == -1) {
        perror("SPI_IOC_WR_MAX_SPEED_HZ");
        return -1;
    }

    return 0;
}

static int spi_transfer(uint8_t *tx, uint8_t *rx, size_t len, uint32_t speed_hz) {
    struct spi_ioc_transfer tr = {
        .tx_buf = (unsigned long)tx,
        .rx_buf = (unsigned long)rx,
        .len = len,
        .speed_hz = speed_hz,
        .bits_per_word = 8,
        .delay_usecs = 0,
    };
    int ret = ioctl(spi_fd, SPI_IOC_MESSAGE(1), &tr);
    if (ret < 1) {
        perror("SPI_IOC_MESSAGE");
        return -1;
    }
    return 0;
}

int main(void) {
    const char *dev = "/dev/spidev0.0";
    uint32_t speed = 500000; // 500 kHz

    if (spi_init(dev, speed) < 0) {
        return 1;
    }

    printf("SPI opened OK: %s, speed=%u Hz\n", dev, speed);

    // 1) Soft reset: write CommandReg(0x01) = 0x0F
    uint8_t tx_reset[2] = { 0x02, 0x0F }; // (0x01<<1)&0x7E = 0x02
    uint8_t rx_reset[2] = {0};
    if (spi_transfer(tx_reset, rx_reset, 2, speed) < 0) {
        return 1;
    }
    usleep(50000); // 50ms

    // 2) Read VersionReg (0x37) -> addr = (0x37<<1)|0x80 = 0xEE
    uint8_t tx_ver[2] = { 0xEE, 0x00 };
    uint8_t rx_ver[2] = {0};
    if (spi_transfer(tx_ver, rx_ver, 2, speed) < 0) {
        return 1;
    }

    printf("VersionReg raw: [%u, %u] -> 0x%02X\n",
           rx_ver[0], rx_ver[1], rx_ver[1]);

    // 3) ลองอ่าน register อื่น ๆ ด้วย
    struct { uint8_t addr; const char *name; } regs[] = {
        {0x01, "Command"},
        {0x07, "Status1"},
        {0x14, "TxControl"},
    };

    for (int i = 0; i < 3; i++) {
        uint8_t a = ((regs[i].addr << 1) & 0x7E) | 0x80;
        uint8_t tx[2] = { a, 0x00 };
        uint8_t rx[2] = {0};
        if (spi_transfer(tx, rx, 2, speed) < 0) {
            return 1;
        }
        printf("%s(0x%02X) = 0x%02X\n", regs[i].name, regs[i].addr, rx[1]);
    }

    close(spi_fd);
    return 0;
}