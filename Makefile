TARGET=server

CC=gcc
CFLAGS=

normal: $(TARGET)

server: server.o common_utils.o
	$(CC) $(CFLAGS) server.o common_utils.o -o server

server.o: server.c common_utils.h config.h
	$(CC) $(CFLAGS) -c server.c

common_utils.o:	common_utils.h common_utils.c
	$(CC) $(CFLAGS) -c common_utils.c

clean:
	$(RM) $(TARGET)
